import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeStructureName,
  parseAliases,
  parseStructureText,
  structureKinds,
} from "@/lib/study-structure";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const years = await prisma.studyYear.findMany({
    where: { userId: session.user.id },
    orderBy: { label: "asc" },
    include: {
      semesters: {
        orderBy: { name: "asc" },
        include: {
          subjects: {
            orderBy: { name: "asc" },
            include: { chapters: { orderBy: { name: "asc" } } },
          },
        },
      },
    },
  });
  return NextResponse.json({ years });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !structureKinds.includes(body.kind))
    return NextResponse.json(
      { error: "Choose a valid course level." },
      { status: 400 },
    );

  const kind = body.kind as (typeof structureKinds)[number];
  const name = parseStructureText(
    body.name,
    kind === "subject" ? 120 : kind === "chapter" ? 140 : 80,
  );
  const aliases = parseAliases(body.aliases);
  if (!name || !aliases)
    return NextResponse.json(
      { error: "Enter a name and up to 20 valid aliases." },
      { status: 400 },
    );

  const owner = session.user.id;
  let created;
  try {
    if (kind === "year") {
      const existing = await prisma.studyYear.findMany({
        where: { userId: owner },
        select: { label: true },
      });
      if (
        existing.some(
          (item) =>
            normalizeStructureName(item.label) === normalizeStructureName(name),
        )
      )
        return NextResponse.json(
          { error: "That academic year already exists." },
          { status: 409 },
        );
      created = await prisma.studyYear.create({
        data: { userId: owner, label: name, aliases },
      });
    } else if (kind === "semester") {
      const parentId = parseStructureText(body.parentId, 100);
      const parent = parentId
        ? await prisma.studyYear.findFirst({
            where: { id: parentId, userId: owner },
            select: { id: true },
          })
        : null;
      if (!parent)
        return NextResponse.json(
          { error: "Choose one of your academic years." },
          { status: 400 },
        );
      const existing = await prisma.semester.findMany({
        where: { studyYearId: parent.id },
        select: { name: true },
      });
      if (
        existing.some(
          (item) =>
            normalizeStructureName(item.name) === normalizeStructureName(name),
        )
      )
        return NextResponse.json(
          { error: "That semester already exists in this academic year." },
          { status: 409 },
        );
      created = await prisma.semester.create({
        data: { userId: owner, studyYearId: parent.id, name, aliases },
      });
    } else if (kind === "subject") {
      const parentId = parseStructureText(body.parentId, 100);
      const parent = parentId
        ? await prisma.semester.findFirst({
            where: { id: parentId, userId: owner },
            select: { id: true },
          })
        : null;
      if (!parent)
        return NextResponse.json(
          { error: "Choose one of your semesters." },
          { status: 400 },
        );
      const existing = await prisma.subject.findMany({
        where: { semesterId: parent.id },
        select: { name: true },
      });
      if (
        existing.some(
          (item) =>
            normalizeStructureName(item.name) === normalizeStructureName(name),
        )
      )
        return NextResponse.json(
          { error: "That subject already exists in this semester." },
          { status: 409 },
        );
      created = await prisma.subject.create({
        data: { userId: owner, semesterId: parent.id, name, aliases },
      });
    } else {
      const parentId = parseStructureText(body.parentId, 100);
      const parent = parentId
        ? await prisma.subject.findFirst({
            where: { id: parentId, userId: owner },
            select: { id: true },
          })
        : null;
      if (!parent)
        return NextResponse.json(
          { error: "Choose one of your subjects." },
          { status: 400 },
        );
      const existing = await prisma.chapter.findMany({
        where: { subjectId: parent.id },
        select: { name: true },
      });
      if (
        existing.some(
          (item) =>
            normalizeStructureName(item.name) === normalizeStructureName(name),
        )
      )
        return NextResponse.json(
          { error: "That chapter already exists in this subject." },
          { status: 409 },
        );
      created = await prisma.chapter.create({
        data: { userId: owner, subjectId: parent.id, name, aliases },
      });
    }
  } catch (error) {
    console.error("Unable to add course structure:", error);
    return NextResponse.json(
      { error: "Unable to save this course item." },
      { status: 500 },
    );
  }
  return NextResponse.json({ item: created }, { status: 201 });
}

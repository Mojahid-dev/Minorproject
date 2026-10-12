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

type Params = { params: Promise<{ kind: string; id: string }> };

async function ownedItem(kind: string, id: string, userId: string) {
  if (kind === "year")
    return prisma.studyYear.findFirst({ where: { id, userId } });
  if (kind === "semester")
    return prisma.semester.findFirst({ where: { id, userId } });
  if (kind === "subject")
    return prisma.subject.findFirst({ where: { id, userId } });
  if (kind === "chapter")
    return prisma.chapter.findFirst({ where: { id, userId } });
  return null;
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { kind, id } = await params;
  if (!structureKinds.includes(kind as (typeof structureKinds)[number]))
    return NextResponse.json(
      { error: "Invalid course level." },
      { status: 400 },
    );
  const current = await ownedItem(kind, id, session.user.id);
  if (!current)
    return NextResponse.json(
      { error: "Course item not found." },
      { status: 404 },
    );
  const body = await request.json().catch(() => null);
  const name = parseStructureText(
    body?.name,
    kind === "subject" ? 120 : kind === "chapter" ? 140 : 80,
  );
  const aliases = parseAliases(body?.aliases);
  if (!name || !aliases)
    return NextResponse.json(
      { error: "Enter a name and up to 20 valid aliases." },
      { status: 400 },
    );

  try {
    if (kind === "year") {
      const duplicates = await prisma.studyYear.findMany({
        where: { userId: session.user.id, NOT: { id } },
        select: { label: true },
      });
      if (
        duplicates.some(
          (item) =>
            normalizeStructureName(item.label) === normalizeStructureName(name),
        )
      )
        return NextResponse.json(
          { error: "That academic year already exists." },
          { status: 409 },
        );
      return NextResponse.json({
        item: await prisma.studyYear.update({
          where: { id },
          data: { label: name, aliases },
        }),
      });
    }
    if (kind === "semester") {
      const currentSemester = await prisma.semester.findUnique({ where: { id }, select: { studyYearId: true } });
      const siblings = currentSemester ? await prisma.semester.findMany({ where: { studyYearId: currentSemester.studyYearId, NOT: { id } }, select: { name: true } }) : [];
      if (siblings.some((item) => normalizeStructureName(item.name) === normalizeStructureName(name))) return NextResponse.json({ error: "That semester already exists in this academic year." }, { status: 409 });
      const value = await prisma.semester.update({
        where: { id },
        data: { name, aliases },
      });
      return NextResponse.json({ item: value });
    }
    if (kind === "subject") {
      const currentSubject = await prisma.subject.findUnique({ where: { id }, select: { semesterId: true } });
      const siblings = currentSubject ? await prisma.subject.findMany({ where: { semesterId: currentSubject.semesterId, NOT: { id } }, select: { name: true } }) : [];
      if (siblings.some((item) => normalizeStructureName(item.name) === normalizeStructureName(name))) return NextResponse.json({ error: "That subject already exists in this semester." }, { status: 409 });
      const value = await prisma.subject.update({
        where: { id },
        data: { name, aliases },
      });
      return NextResponse.json({ item: value });
    }
    const currentChapter = await prisma.chapter.findUnique({ where: { id }, select: { subjectId: true } });
    const siblings = currentChapter ? await prisma.chapter.findMany({ where: { subjectId: currentChapter.subjectId, NOT: { id } }, select: { name: true } }) : [];
    if (siblings.some((item) => normalizeStructureName(item.name) === normalizeStructureName(name))) return NextResponse.json({ error: "That chapter already exists in this subject." }, { status: 409 });
    const value = await prisma.chapter.update({
      where: { id },
      data: { name, aliases },
    });
    return NextResponse.json({ item: value });
  } catch (error) {
    console.error("Unable to update course item:", error);
    return NextResponse.json(
      { error: "Unable to update this course item." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { kind, id } = await params;
  if (!structureKinds.includes(kind as (typeof structureKinds)[number]))
    return NextResponse.json(
      { error: "Invalid course level." },
      { status: 400 },
    );
  const current = await ownedItem(kind, id, session.user.id);
  if (!current)
    return NextResponse.json(
      { error: "Course item not found." },
      { status: 404 },
    );

  try {
    if (kind === "year") await prisma.studyYear.delete({ where: { id } });
    else if (kind === "semester")
      await prisma.semester.delete({ where: { id } });
    else if (kind === "subject") await prisma.subject.delete({ where: { id } });
    else await prisma.chapter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to delete course item:", error);
    return NextResponse.json(
      { error: "Unable to remove this course item." },
      { status: 500 },
    );
  }
}

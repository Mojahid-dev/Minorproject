import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type Kind = "year" | "semester" | "subject" | "chapter";

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { kind, parentId, orderedIds } = body ?? {};
  if (!["year", "semester", "subject", "chapter"].includes(kind) || !Array.isArray(orderedIds) || orderedIds.length > 500 || orderedIds.some((id: unknown) => typeof id !== "string")) {
    return NextResponse.json({ error: "Invalid ordering request." }, { status: 400 });
  }

  const userId = session.user.id;
  let rows: { id: string }[] = [];
  if (kind === "year") {
    rows = await prisma.studyYear.findMany({ where: { userId }, select: { id: true } });
  } else if (kind === "semester") {
    const parent = await prisma.studyYear.findFirst({ where: { id: parentId, userId }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: "Parent course not found." }, { status: 404 });
    rows = await prisma.semester.findMany({ where: { studyYearId: parent.id, userId }, select: { id: true } });
  } else if (kind === "subject") {
    const parent = await prisma.semester.findFirst({ where: { id: parentId, userId }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: "Parent semester not found." }, { status: 404 });
    rows = await prisma.subject.findMany({ where: { semesterId: parent.id, userId }, select: { id: true } });
  } else {
    const parent = await prisma.subject.findFirst({ where: { id: parentId, userId }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: "Parent subject not found." }, { status: 404 });
    rows = await prisma.chapter.findMany({ where: { subjectId: parent.id, userId }, select: { id: true } });
  }

  const currentIds = rows.map((row) => row.id);
  if (orderedIds.length !== currentIds.length || new Set(orderedIds).size !== currentIds.length || orderedIds.some((id: string) => !currentIds.includes(id))) {
    return NextResponse.json({ error: "The folder order is out of date. Refresh and try again." }, { status: 409 });
  }

  await prisma.$transaction(orderedIds.map((id: string, index: number) => {
    if (kind === "year") return prisma.studyYear.updateMany({ where: { id, userId }, data: { sortOrder: index } });
    if (kind === "semester") return prisma.semester.updateMany({ where: { id, userId, studyYearId: parentId }, data: { sortOrder: index } });
    if (kind === "subject") return prisma.subject.updateMany({ where: { id, userId, semesterId: parentId }, data: { sortOrder: index } });
    return prisma.chapter.updateMany({ where: { id, userId, subjectId: parentId }, data: { sortOrder: index } });
  }));
  return NextResponse.json({ success: true });
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { resourceId } = await params;
  const resource = await prisma.resource.findFirst({ where: { id: resourceId, userId: session.user.id }, select: { id: true } });
  if (!resource) return NextResponse.json({ error: "Resource not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Choose a course location." }, { status: 400 });
  const ids = ["studyYearId", "semesterId", "subjectId", "chapterId"] as const;
  for (const key of ids) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") return NextResponse.json({ error: "Invalid course location." }, { status: 400 });
  }

  const owner = session.user.id;
  const [year, semester, subject, chapter] = await Promise.all([
    body.studyYearId ? prisma.studyYear.findFirst({ where: { id: body.studyYearId, userId: owner }, select: { id: true } }) : null,
    body.semesterId ? prisma.semester.findFirst({ where: { id: body.semesterId, userId: owner }, select: { id: true, studyYearId: true } }) : null,
    body.subjectId ? prisma.subject.findFirst({ where: { id: body.subjectId, userId: owner }, select: { id: true, semesterId: true } }) : null,
    body.chapterId ? prisma.chapter.findFirst({ where: { id: body.chapterId, userId: owner }, select: { id: true, subjectId: true } }) : null,
  ]);
  if ((body.studyYearId && !year) || (body.semesterId && !semester) || (body.subjectId && !subject) || (body.chapterId && !chapter)) {
    return NextResponse.json({ error: "That course location is not available in your workspace." }, { status: 400 });
  }
  if (chapter && subject && chapter.subjectId !== subject.id) return NextResponse.json({ error: "The chapter must belong to the selected subject." }, { status: 400 });
  const resolvedSubjectId = subject?.id ?? chapter?.subjectId ?? null;
  const resolvedSubject = resolvedSubjectId
    ? await prisma.subject.findFirst({ where: { id: resolvedSubjectId, userId: owner }, select: { id: true, semesterId: true } })
    : null;
  const resolvedSemesterId = semester?.id ?? resolvedSubject?.semesterId ?? null;
  const resolvedSemester = resolvedSemesterId
    ? await prisma.semester.findFirst({ where: { id: resolvedSemesterId, userId: owner }, select: { id: true, studyYearId: true } })
    : null;
  const resolvedYearId = year?.id ?? resolvedSemester?.studyYearId ?? null;
  if (semester && resolvedSubject && semester.id !== resolvedSubject.semesterId) return NextResponse.json({ error: "The subject must belong to the selected semester." }, { status: 400 });
  if (year && resolvedSemester && year.id !== resolvedSemester.studyYearId) return NextResponse.json({ error: "The semester must belong to the selected academic year." }, { status: 400 });

  const hasLocation = Boolean(resolvedYearId || resolvedSemesterId || resolvedSubjectId || chapter?.id);
  const hasSubjectLocation = Boolean(resolvedSubjectId);
  const updated = await prisma.resource.update({
    where: { id: resource.id },
    data: {
      studyYearId: resolvedYearId,
      semesterId: resolvedSemesterId,
      subjectId: resolvedSubjectId,
      chapterId: chapter?.id ?? null,
      awaitingOrganizationInput: false,
      organizationStatus: hasSubjectLocation ? "ORGANIZED" : "NEEDS_REVIEW",
      organizationNote: hasSubjectLocation
        ? "Manually organized by you."
        : hasLocation
          ? "Choose a subject to finish organizing this file."
          : "This file is in Unsorted. Choose a course location when ready.",
    },
    select: { id: true, organizationStatus: true, organizationNote: true, studyYearId: true, semesterId: true, subjectId: true, chapterId: true },
  });
  return NextResponse.json({ resource: updated });
}

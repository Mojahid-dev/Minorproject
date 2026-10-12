import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeStructureName, parseStructureText } from "@/lib/study-structure";
import { headers } from "next/headers";
import { after, NextResponse } from "next/server";
import { processStudyResource } from "@/lib/study-library";

type Names = { year: string; semester: string; subject: string; unit: string | null };

function cleanTags(value: unknown) {
  if (value === undefined) return [] as string[];
  if (!Array.isArray(value) || value.length > 20) return null;
  const tags = value.map((item) => parseStructureText(item, 60));
  if (tags.some((tag) => !tag)) return null;
  const unique = new Map<string, string>();
  for (const tag of tags as string[]) {
    const trimmed = tag.trim().replace(/^#/, "");
    if (!trimmed) continue;
    unique.set(normalizeStructureName(trimmed), trimmed);
  }
  return Array.from(unique.values()).slice(0, 20);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const requestedIds: unknown[] = Array.isArray(body?.resourceIds) ? body.resourceIds : [];
  const resourceIds: string[] = Array.from(new Set(requestedIds.filter((id): id is string => typeof id === "string" && id.length <= 100)));
  const yearName = parseStructureText(body?.year, 80);
  const semesterName = parseStructureText(body?.semester, 80);
  const subjectName = parseStructureText(body?.subject, 120);
  const unitName = body?.unit === undefined || body?.unit === null || body.unit === "" ? null : parseStructureText(body.unit, 140);
  const tags = cleanTags(body?.tags);

  if (!resourceIds.length || resourceIds.length > 50) {
    return NextResponse.json({ error: "Select between 1 and 50 uploaded files." }, { status: 400 });
  }
  if (!yearName || !semesterName || !subjectName || (body?.unit && !unitName) || !tags) {
    return NextResponse.json({ error: "Add a valid academic year, semester, subject, optional unit, and up to 20 tags." }, { status: 400 });
  }

  const userId = session.user.id;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const resources = await tx.resource.findMany({
        where: { id: { in: resourceIds }, userId, status: "READY" },
        select: { id: true },
      });
      if (resources.length !== resourceIds.length) throw new Error("One or more selected files are not ready or do not belong to your workspace.");

      async function findOrCreateYear(name: string) {
        const existing = await tx.studyYear.findMany({ where: { userId }, select: { id: true, label: true } });
        const found = existing.find((item) => normalizeStructureName(item.label) === normalizeStructureName(name));
        return found ?? tx.studyYear.create({ data: { userId, label: name } });
      }
      async function findOrCreateSemester(parentId: string, name: string) {
        const existing = await tx.semester.findMany({ where: { userId, studyYearId: parentId }, select: { id: true, name: true } });
        const found = existing.find((item) => normalizeStructureName(item.name) === normalizeStructureName(name));
        return found ?? tx.semester.create({ data: { userId, studyYearId: parentId, name } });
      }
      async function findOrCreateSubject(parentId: string, name: string) {
        const existing = await tx.subject.findMany({ where: { userId, semesterId: parentId }, select: { id: true, name: true } });
        const found = existing.find((item) => normalizeStructureName(item.name) === normalizeStructureName(name));
        return found ?? tx.subject.create({ data: { userId, semesterId: parentId, name } });
      }
      async function findOrCreateUnit(parentId: string, name: string) {
        const existing = await tx.chapter.findMany({ where: { userId, subjectId: parentId }, select: { id: true, name: true } });
        const found = existing.find((item) => normalizeStructureName(item.name) === normalizeStructureName(name));
        return found ?? tx.chapter.create({ data: { userId, subjectId: parentId, name } });
      }

      const year = await findOrCreateYear(yearName);
      const semester = await findOrCreateSemester(year.id, semesterName);
      const subject = await findOrCreateSubject(semester.id, subjectName);
      const unit = unitName ? await findOrCreateUnit(subject.id, unitName) : null;
      await tx.resource.updateMany({
        where: { id: { in: resourceIds }, userId },
        data: {
          studyYearId: year.id,
          semesterId: semester.id,
          subjectId: subject.id,
          chapterId: unit?.id ?? null,
          tags,
          awaitingOrganizationInput: false,
          organizationStatus: "ORGANIZED",
          organizationNote: "Organized using the details you added during upload.",
        },
      });

      return { names: { year: year.label, semester: semester.name, subject: subject.name, unit: unit?.name ?? null } satisfies Names, count: resourceIds.length };
    });
    after(async () => {
      await Promise.all(resourceIds.map((resourceId) => processStudyResource(resourceId, false, true)));
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to organize these files.";
    const conflict = message.includes("Unique constraint");
    const invalidSelection = message.startsWith("One or more selected files");
    console.error("Unable to organize uploaded resources:", error);
    return NextResponse.json({ error: conflict ? "A folder with a similar name was created at the same time. Refresh your course folders and try again." : invalidSelection ? message : "Unable to organize these files right now. Please try again." }, { status: conflict ? 409 : invalidSelection ? 400 : 500 });
  }
}

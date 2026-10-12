import { auth } from "@/lib/auth";
import { dateOnlyToDate, isDateOnly, serializeTask } from "@/lib/task-utils";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ taskId: string }> };

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taskId } = await params;
  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true },
  });
  if (!existing)
    return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json(
      { error: "Invalid task update." },
      { status: 400 },
    );

  const data: {
    title?: string;
    notes?: string | null;
    dueDate?: Date | null;
    completedAt?: Date | null;
  } = {};
  if ("title" in body) {
    if (
      typeof body.title !== "string" ||
      !body.title.trim() ||
      body.title.trim().length > 180
    ) {
      return NextResponse.json(
        { error: "Task titles must be between 1 and 180 characters." },
        { status: 400 },
      );
    }
    data.title = body.title.trim();
  }
  if ("notes" in body) {
    if (
      body.notes !== null &&
      (typeof body.notes !== "string" || body.notes.length > 5000)
    ) {
      return NextResponse.json(
        { error: "Task notes must be 5,000 characters or fewer." },
        { status: 400 },
      );
    }
    data.notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;
  }
  if ("dueDate" in body) {
    if (body.dueDate !== null && !isDateOnly(body.dueDate)) {
      return NextResponse.json(
        { error: "Due date must be a valid calendar date." },
        { status: 400 },
      );
    }
    data.dueDate = body.dueDate ? dateOnlyToDate(body.dueDate) : null;
  }
  if ("completed" in body) {
    if (typeof body.completed !== "boolean")
      return NextResponse.json(
        { error: "Completed must be true or false." },
        { status: 400 },
      );
    data.completedAt = body.completed ? new Date() : null;
  }
  if (Object.keys(data).length === 0)
    return NextResponse.json(
      { error: "No task changes were provided." },
      { status: 400 },
    );

  const task = await prisma.task.update({ where: { id: taskId }, data });
  return NextResponse.json({ task: serializeTask(task) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taskId } = await params;
  const result = await prisma.task.deleteMany({
    where: { id: taskId, userId },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}

import { auth } from "@/lib/auth";
import { dateOnlyToDate, isDateOnly, serializeTask } from "@/lib/task-utils";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });
  return NextResponse.json({ tasks: tasks.map(serializeTask) });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string") {
    return NextResponse.json({ error: "A task title is required." }, { status: 400 });
  }
  const title = body.title.trim();
  if (!title || title.length > 180) {
    return NextResponse.json({ error: "Task titles must be between 1 and 180 characters." }, { status: 400 });
  }
  if (body.notes !== undefined && body.notes !== null && (typeof body.notes !== "string" || body.notes.length > 5000)) {
    return NextResponse.json({ error: "Task notes must be 5,000 characters or fewer." }, { status: 400 });
  }
  if (body.dueDate !== undefined && body.dueDate !== null && !isDateOnly(body.dueDate)) {
    return NextResponse.json({ error: "Due date must be a valid calendar date." }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      userId,
      title,
      notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
      dueDate: body.dueDate ? dateOnlyToDate(body.dueDate) : null,
    },
  });
  return NextResponse.json({ task: serializeTask(task) }, { status: 201 });
}

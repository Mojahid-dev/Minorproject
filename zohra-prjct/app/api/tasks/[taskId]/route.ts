import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const statuses = ["TODO", "IN_PROGRESS", "DONE"] as const;
const priorities = ["LOW", "NORMAL", "HIGH"] as const;

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const ownerId = await userId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taskId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid task update." }, { status: 400 });
  const data: { title?: string; description?: string | null; status?: typeof statuses[number]; priority?: typeof priorities[number]; dueDate?: Date | null } = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 160) return NextResponse.json({ error: "Task titles must be between 1 and 160 characters." }, { status: 400 });
    data.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (body.description !== null && (typeof body.description !== "string" || body.description.length > 5000)) return NextResponse.json({ error: "Descriptions must be 5,000 characters or fewer." }, { status: 400 });
    data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }
  if (body.status !== undefined) {
    if (!statuses.includes(body.status)) return NextResponse.json({ error: "Choose a valid task status." }, { status: 400 });
    data.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!priorities.includes(body.priority)) return NextResponse.json({ error: "Choose a valid task priority." }, { status: 400 });
    data.priority = body.priority;
  }
  if (body.dueDate !== undefined) {
    const date = body.dueDate ? new Date(body.dueDate) : null;
    if (body.dueDate && Number.isNaN(date?.getTime())) return NextResponse.json({ error: "Choose a valid due date." }, { status: 400 });
    data.dueDate = date;
  }
  const updated = await prisma.task.updateMany({ where: { id: taskId, userId: ownerId }, data });
  if (!updated.count) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  const task = await prisma.task.findFirst({ where: { id: taskId, userId: ownerId } });
  return NextResponse.json({ task });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const ownerId = await userId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taskId } = await params;
  const deleted = await prisma.task.deleteMany({ where: { id: taskId, userId: ownerId } });
  if (!deleted.count) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}

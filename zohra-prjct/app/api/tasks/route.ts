import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const statuses = ["TODO", "IN_PROGRESS", "DONE"] as const;
const priorities = ["LOW", "NORMAL", "HIGH"] as const;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id;
}

export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "all";
  const requestedDay = url.searchParams.get("date");
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const requestedDate = requestedDay && datePattern.test(requestedDay) ? new Date(`${requestedDay}T00:00:00.000Z`) : null;
  if (requestedDay && (!requestedDate || Number.isNaN(requestedDate.getTime()) || requestedDate.toISOString().slice(0, 10) !== requestedDay)) {
    return NextResponse.json({ error: "Choose a valid date." }, { status: 400 });
  }
  const startOfToday = requestedDate
    ? requestedDate
    : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

  const where = { userId,
    ...(filter === "completed" ? { status: "DONE" as const } : ["today", "upcoming", "overdue"].includes(filter) ? { status: { not: "DONE" as const } } : {}),
    ...(filter === "today" ? { dueDate: { gte: startOfToday, lt: startOfTomorrow } } : {}),
    ...(filter === "upcoming" ? { dueDate: { gte: startOfTomorrow } } : {}),
    ...(filter === "overdue" ? { dueDate: { lt: startOfToday } } : {}) };
  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string") return NextResponse.json({ error: "A task title is required." }, { status: 400 });
  const title = body.title.trim();
  if (!title || title.length > 160) return NextResponse.json({ error: "Task titles must be between 1 and 160 characters." }, { status: 400 });
  if (body.description != null && (typeof body.description !== "string" || body.description.length > 5000)) return NextResponse.json({ error: "Descriptions must be 5,000 characters or fewer." }, { status: 400 });
  if (body.priority != null && !priorities.includes(body.priority)) return NextResponse.json({ error: "Choose a valid task priority." }, { status: 400 });
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.dueDate && Number.isNaN(dueDate?.getTime())) return NextResponse.json({ error: "Choose a valid due date." }, { status: 400 });

  const task = await prisma.task.create({ data: { userId, title, description: body.description?.trim() || null, priority: body.priority ?? "NORMAL", dueDate } });
  return NextResponse.json({ task }, { status: 201 });
}

export { statuses, priorities };

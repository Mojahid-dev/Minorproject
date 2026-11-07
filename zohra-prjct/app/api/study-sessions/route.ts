import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

// A running session is only treated as abandoned after this long without a heartbeat.
// Phones suspend timers whenever the screen locks, so a short window would drop real study time.
const STALE_MS = 4 * 60 * 60 * 1000;

function elapsedSeconds(session: {
  accumulatedSeconds: number;
  status: string;
  segmentStartedAt: Date | null;
}) {
  if (session.status !== "RUNNING" || !session.segmentStartedAt)
    return session.accumulatedSeconds;
  return (
    session.accumulatedSeconds +
    Math.max(
      0,
      Math.floor((Date.now() - session.segmentStartedAt.getTime()) / 1000),
    )
  );
}

export async function GET() {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [initialActive, sessions, subjects, tasks] = await Promise.all([
    prisma.studySession.findFirst({
      where: { userId, status: { in: ["RUNNING", "PAUSED"] } },
      include: {
        subject: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    }),
    prisma.studySession.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { endedAt: "desc" },
      take: 20,
      include: {
        subject: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    }),
    prisma.subject.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { userId, completedAt: null },
      orderBy: [
        { dueDate: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: 100,
      select: { id: true, title: true },
    }),
  ]);
  let active = initialActive;
  if (
    active?.status === "RUNNING" &&
    active.lastHeartbeatAt &&
    Date.now() - active.lastHeartbeatAt.getTime() > STALE_MS &&
    active.segmentStartedAt
  ) {
    const safeEnd = active.lastHeartbeatAt;
    const safeSeconds = Math.max(
      0,
      Math.floor(
        (safeEnd.getTime() - active.segmentStartedAt.getTime()) / 1000,
      ),
    );
    active = await prisma.studySession.update({
      where: { id: active.id },
      data: {
        status: "PAUSED",
        accumulatedSeconds: active.accumulatedSeconds + safeSeconds,
        segmentStartedAt: null,
      },
      include: {
        subject: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });
  }
  return NextResponse.json({
    active: active
      ? { ...active, elapsedSeconds: elapsedSeconds(active) }
      : null,
    sessions,
    subjects,
    tasks,
  });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string")
    return NextResponse.json(
      { error: "Invalid session action." },
      { status: 400 },
    );
  const now = new Date();

  if (body.action === "start") {
    const mode = "STOPWATCH" as const;
    const subjectId =
      typeof body.subjectId === "string" && body.subjectId
        ? body.subjectId
        : null;
    const taskId =
      typeof body.taskId === "string" && body.taskId ? body.taskId : null;
    const topic =
      typeof body.topic === "string"
        ? body.topic.trim().slice(0, 140) || null
        : null;
    if (
      subjectId &&
      !(await prisma.subject.findFirst({
        where: { id: subjectId, userId },
        select: { id: true },
      }))
    )
      return NextResponse.json(
        { error: "That subject doesn't belong to your workspace." },
        { status: 400 },
      );
    if (
      taskId &&
      !(await prisma.task.findFirst({
        where: { id: taskId, userId },
        select: { id: true },
      }))
    )
      return NextResponse.json(
        { error: "That task doesn't belong to your workspace." },
        { status: 400 },
      );
    try {
      const session = await prisma.studySession.create({
        data: {
          userId,
          subjectId,
          taskId,
          topic,
          mode,
          status: "RUNNING",
          startedAt: now,
          segmentStartedAt: now,
          lastHeartbeatAt: now,
        },
        include: {
          subject: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
        },
      });
      return NextResponse.json(
        { session: { ...session, elapsedSeconds: 0 } },
        { status: 201 },
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      )
        return NextResponse.json(
          {
            error:
              "You already have an unfinished study session. Resume or finish it first.",
          },
          { status: 409 },
        );
      console.error("Unable to start study session:", error);
      return NextResponse.json(
        { error: "Unable to start your study session." },
        { status: 500 },
      );
    }
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId)
    return NextResponse.json(
      { error: "A session ID is required." },
      { status: 400 },
    );
  const existing = await prisma.studySession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!existing)
    return NextResponse.json(
      { error: "Study session not found." },
      { status: 404 },
    );

  if (body.action === "heartbeat") {
    if (existing.status !== "RUNNING")
      return NextResponse.json({
        session: { ...existing, elapsedSeconds: existing.accumulatedSeconds },
      });
    if (
      existing.lastHeartbeatAt &&
      now.getTime() - existing.lastHeartbeatAt.getTime() > STALE_MS &&
      existing.segmentStartedAt
    ) {
      const safeSeconds = Math.max(
        0,
        Math.floor(
          (existing.lastHeartbeatAt.getTime() -
            existing.segmentStartedAt.getTime()) /
            1000,
        ),
      );
      const paused = await prisma.studySession.update({
        where: { id: existing.id },
        data: {
          status: "PAUSED",
          accumulatedSeconds: existing.accumulatedSeconds + safeSeconds,
          segmentStartedAt: null,
        },
        include: {
          subject: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
        },
      });
      return NextResponse.json({
        session: { ...paused, elapsedSeconds: paused.accumulatedSeconds },
      });
    }
    const updated = await prisma.studySession.update({
      where: { id: existing.id },
      data: { lastHeartbeatAt: now },
      include: {
        subject: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json({
      session: { ...updated, elapsedSeconds: elapsedSeconds(updated) },
    });
  }

  if (body.action === "pause") {
    if (existing.status !== "RUNNING" || !existing.segmentStartedAt)
      return NextResponse.json(
        { error: "This session isn't running." },
        { status: 409 },
      );
    const safeEnd =
      existing.lastHeartbeatAt &&
      now.getTime() - existing.lastHeartbeatAt.getTime() > STALE_MS
        ? existing.lastHeartbeatAt
        : now;
    const elapsed = Math.max(
      0,
      Math.floor(
        (safeEnd.getTime() - existing.segmentStartedAt.getTime()) / 1000,
      ),
    );
    const session = await prisma.studySession.update({
      where: { id: existing.id },
      data: {
        status: "PAUSED",
        accumulatedSeconds: existing.accumulatedSeconds + elapsed,
        segmentStartedAt: null,
      },
      include: {
        subject: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json({
      session: { ...session, elapsedSeconds: session.accumulatedSeconds },
    });
  }

  if (body.action === "resume") {
    if (existing.status !== "PAUSED")
      return NextResponse.json(
        { error: "Only paused sessions can be resumed." },
        { status: 409 },
      );
    const session = await prisma.studySession.update({
      where: { id: existing.id },
      data: { status: "RUNNING", segmentStartedAt: now, lastHeartbeatAt: now },
      include: {
        subject: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json({
      session: { ...session, elapsedSeconds: session.accumulatedSeconds },
    });
  }

  if (body.action === "finish") {
    if (existing.status === "COMPLETED")
      return NextResponse.json(
        { error: "This session is already complete." },
        { status: 409 },
      );
    const finishAt =
      existing.status === "RUNNING" &&
      existing.lastHeartbeatAt &&
      now.getTime() - existing.lastHeartbeatAt.getTime() > STALE_MS
        ? existing.lastHeartbeatAt
        : now;
    const currentSegment =
      existing.status === "RUNNING" && existing.segmentStartedAt
        ? Math.max(
            0,
            Math.floor(
              (finishAt.getTime() - existing.segmentStartedAt.getTime()) / 1000,
            ),
          )
        : 0;
    const durationSeconds = existing.accumulatedSeconds + currentSegment;
    if (durationSeconds < 30)
      return NextResponse.json(
        { error: "Study for at least 30 seconds before saving a session." },
        { status: 400 },
      );
    const notes =
      typeof body.notes === "string"
        ? body.notes.trim().slice(0, 1000) || null
        : null;
    const session = await prisma.studySession.update({
      where: { id: existing.id },
      data: {
        status: "COMPLETED",
        endedAt: finishAt,
        segmentStartedAt: null,
        accumulatedSeconds: durationSeconds,
        durationSeconds,
        notes,
      },
      include: {
        subject: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json({ session });
  }

  if (body.action === "discard") {
    if (existing.status === "COMPLETED")
      return NextResponse.json(
        { error: "Completed sessions cannot be discarded here." },
        { status: 409 },
      );
    await prisma.studySession.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: "Unknown session action." },
    { status: 400 },
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { elapsedSeconds, activeFocusSeconds } from "@/lib/focus/timer";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const STALE_RUNNING_MS = 4 * 60 * 60 * 1000;
const STALE_PAUSED_MS = 2 * 60 * 60 * 1000;
const includeSession = {
  subject: { select: { id: true, name: true } },
  task: { select: { id: true, title: true } },
  parkingLotNotes: { orderBy: { createdAt: "asc" as const } },
};

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

function serialize(session: any, now: Date) {
  const elapsed = elapsedSeconds(session, now);
  const focused = activeFocusSeconds(session, now);
  const referenceTime = session.status === "PAUSED" && session.pausedAt ? session.pausedAt : now;
  const remaining = session.endsAt && session.mode !== "STOPWATCH"
    ? Math.max(0, Math.ceil((session.endsAt.getTime() - referenceTime.getTime()) / 1000))
    : null;
  return { ...session, elapsedSeconds: elapsed, focusedSeconds: focused, remainingSeconds: remaining };
}

async function advancePomodoro(session: any, now: Date) {
  if (session.mode !== "POMODORO" || session.status !== "RUNNING" || !session.endsAt || session.endsAt > now) return session;
  const phaseEnd = session.endsAt;
  const currentSegmentSeconds = session.segmentStartedAt
    ? Math.max(0, Math.floor((phaseEnd.getTime() - session.segmentStartedAt.getTime()) / 1000))
    : 0;
  const completedPhaseSeconds = (session.phaseAccumulatedSeconds ?? 0) + currentSegmentSeconds;
  const nextPhase = session.pomodoroPhase === "FOCUS" ? (session.currentCycle % 4 === 0 ? "LONG_BREAK" : "SHORT_BREAK") : "FOCUS";
  const nextCycle = session.pomodoroPhase === "LONG_BREAK" ? 1 : session.pomodoroPhase === "SHORT_BREAK" ? session.currentCycle + 1 : session.currentCycle;
  const nextDuration = nextPhase === "FOCUS" ? session.focusDurationSeconds : nextPhase === "SHORT_BREAK" ? session.shortBreakSeconds : session.longBreakSeconds;
  const focusIncrement = session.pomodoroPhase === "FOCUS" ? completedPhaseSeconds : 0;
  return prisma.studySession.update({
    where: { id: session.id },
    data: {
      accumulatedSeconds: session.accumulatedSeconds + currentSegmentSeconds,
      focusSeconds: session.focusSeconds + focusIncrement,
      phaseAccumulatedSeconds: 0,
      pomodoroPhase: nextPhase,
      currentCycle: nextCycle,
      phaseStartedAt: phaseEnd,
      segmentStartedAt: phaseEnd,
      endsAt: new Date(phaseEnd.getTime() + nextDuration * 1000),
      lastHeartbeatAt: now,
      events: { create: { type: "PHASE_CHANGED" } },
    },
    include: includeSession,
  });
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  let active = await prisma.studySession.findFirst({
    where: { userId: id, status: { in: ["RUNNING", "PAUSED"] } },
    include: includeSession,
  });

  if (active?.status === "PAUSED" && active.pausedAt && now.getTime() - active.pausedAt.getTime() > STALE_PAUSED_MS) {
    active = await prisma.studySession.update({ where: { id: active.id }, data: { status: "ABANDONED", endedAt: active.pausedAt, pausedSeconds: active.pausedSeconds + Math.max(0, Math.floor((now.getTime() - active.pausedAt.getTime()) / 1000)), durationSeconds: Math.max(0, (active.mode === "POMODORO" ? active.focusSeconds + (active.pomodoroPhase === "FOCUS" ? active.phaseAccumulatedSeconds : 0) : active.focusSeconds) - active.awaySeconds), focusSeconds: active.mode === "POMODORO" ? active.focusSeconds + (active.pomodoroPhase === "FOCUS" ? active.phaseAccumulatedSeconds : 0) : active.focusSeconds, endReason: "INTERRUPTED", events: { create: { type: "END" } } }, include: includeSession });
  } else if (active?.status === "RUNNING" && active.mode !== "POMODORO" && active.mode !== "STOPWATCH" && active.endsAt && now.getTime() > active.endsAt.getTime() + 10 * 60 * 1000) {
    const elapsed = active.accumulatedSeconds + Math.max(0, Math.floor((active.endsAt.getTime() - (active.segmentStartedAt?.getTime() ?? active.startedAt.getTime())) / 1000));
    active = await prisma.studySession.update({ where: { id: active.id }, data: { status: "COMPLETED", endedAt: active.endsAt, segmentStartedAt: null, accumulatedSeconds: elapsed, durationSeconds: Math.max(0, elapsed - active.awaySeconds), focusSeconds: Math.max(active.focusSeconds, elapsed - active.awaySeconds), endReason: "TIMER_COMPLETED", events: { create: { type: "END" } } }, include: includeSession });
  } else if (active?.status === "RUNNING" && active.lastHeartbeatAt && now.getTime() - active.lastHeartbeatAt.getTime() > STALE_RUNNING_MS && active.segmentStartedAt) {
    const safe = Math.max(0, Math.floor((active.lastHeartbeatAt.getTime() - active.segmentStartedAt.getTime()) / 1000));
    active = await prisma.studySession.update({ where: { id: active.id }, data: { status: "PAUSED", pausedAt: active.lastHeartbeatAt, accumulatedSeconds: active.accumulatedSeconds + safe, focusSeconds: active.mode === "POMODORO" ? active.focusSeconds : active.focusSeconds + safe, phaseAccumulatedSeconds: active.mode === "POMODORO" ? active.phaseAccumulatedSeconds + safe : active.phaseAccumulatedSeconds, segmentStartedAt: null, events: { create: { type: "PAUSE" } } }, include: includeSession });
  } else if (active?.status === "RUNNING" && active.mode === "POMODORO") {
    active = await advancePomodoro(active, now);
  }

  const [sessions, subjects, tasks] = await Promise.all([
    prisma.studySession.findMany({ where: { userId: id, status: { in: ["COMPLETED", "ABANDONED"] } }, orderBy: { endedAt: "desc" }, take: 20, include: includeSession }),
    prisma.subject.findMany({ where: { userId: id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.task.findMany({ where: { userId: id, completedAt: null }, orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }], take: 100, select: { id: true, title: true } }),
  ]);
  const live = active && ["RUNNING", "PAUSED"].includes(active.status) ? serialize(active, now) : null;
  return NextResponse.json({ active: live, sessions, subjects, tasks, serverNow: now.toISOString() });
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || body.action !== "start") return NextResponse.json({ error: "Invalid start request." }, { status: 400 });
  const mode = ["COUNTDOWN", "STOPWATCH", "POMODORO"].includes(body.mode) ? body.mode : "COUNTDOWN";
  const plannedSeconds = Math.max(60, Math.min(12 * 60 * 60, Number(body.plannedSeconds) || 50 * 60));
  const focusDurationSeconds = Math.max(60, Math.min(180 * 60, Number(body.focusDurationSeconds) || 25 * 60));
  const shortBreakSeconds = Math.max(60, Math.min(60 * 60, Number(body.shortBreakSeconds) || 5 * 60));
  const longBreakSeconds = Math.max(60, Math.min(90 * 60, Number(body.longBreakSeconds) || 15 * 60));
  const subjectId = typeof body.subjectId === "string" && body.subjectId ? body.subjectId : null;
  const taskId = typeof body.taskId === "string" && body.taskId ? body.taskId : null;
  if (subjectId && !(await prisma.subject.findFirst({ where: { id: subjectId, userId: id }, select: { id: true } }))) return NextResponse.json({ error: "Invalid subject." }, { status: 400 });
  if (taskId && !(await prisma.task.findFirst({ where: { id: taskId, userId: id }, select: { id: true } }))) return NextResponse.json({ error: "Invalid task." }, { status: 400 });
  const now = new Date();
  try {
    const session = await prisma.studySession.create({
      data: {
        userId: id, subjectId, taskId,
        topic: typeof body.topic === "string" ? body.topic.trim().slice(0, 140) || null : null,
        goal: typeof body.goal === "string" ? body.goal.trim().slice(0, 240) || null : null,
        mode, status: "RUNNING", startedAt: now, segmentStartedAt: now, phaseStartedAt: now, lastHeartbeatAt: now,
        plannedSeconds: mode === "STOPWATCH" ? 0 : mode === "POMODORO" ? focusDurationSeconds : plannedSeconds,
        endsAt: mode === "STOPWATCH" ? null : new Date(now.getTime() + (mode === "POMODORO" ? focusDurationSeconds : plannedSeconds) * 1000),
        pomodoroPhase: mode === "POMODORO" ? "FOCUS" : null,
        focusDurationSeconds, shortBreakSeconds, longBreakSeconds,
        strictMode: Boolean(body.strictMode), focusMode: Boolean(body.focusMode),
        events: { create: { type: "RESUME" } },
      }, include: includeSession,
    });
    return NextResponse.json({ session: serialize(session, now), serverNow: now.toISOString() }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: "You already have an unfinished study session. Resume or finish it first." }, { status: 409 });
    console.error("Focus session start failed", error);
    return NextResponse.json({ error: "Unable to start the focus session." }, { status: 500 });
  }
}

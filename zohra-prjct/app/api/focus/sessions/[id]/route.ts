import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { elapsedSeconds, activeFocusSeconds } from "@/lib/focus/timer";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const includeSession = {
  subject: { select: { id: true, name: true } },
  task: { select: { id: true, title: true } },
  parkingLotNotes: { orderBy: { createdAt: "asc" as const } },
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  const userId = authSession.user.id;
  const existing = await prisma.studySession.findFirst({ where: { id, userId }, include: includeSession });
  if (!existing) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  const now = new Date();
  const runningSeconds = existing.status === "RUNNING" && existing.segmentStartedAt
    ? Math.max(0, Math.floor((now.getTime() - existing.segmentStartedAt.getTime()) / 1000))
    : 0;

  if (body.action === "pause") {
    if (existing.status !== "RUNNING") return NextResponse.json({ error: "This session is not running." }, { status: 409 });
    const updated = await prisma.studySession.update({ where: { id }, data: {
      status: "PAUSED", pausedAt: now, pausedSeconds: existing.pausedSeconds,
      accumulatedSeconds: existing.accumulatedSeconds + runningSeconds,
      focusSeconds: existing.mode === "POMODORO" ? existing.focusSeconds : existing.focusSeconds + runningSeconds,
      phaseAccumulatedSeconds: existing.mode === "POMODORO" ? existing.phaseAccumulatedSeconds + runningSeconds : existing.phaseAccumulatedSeconds,
      segmentStartedAt: null, lastHeartbeatAt: now,
      events: { create: { type: "PAUSE" } },
    }, include: includeSession });
    return NextResponse.json({ session: { ...updated, elapsedSeconds: updated.accumulatedSeconds, focusedSeconds: Math.max(0, updated.focusSeconds - updated.awaySeconds), remainingSeconds: updated.endsAt ? Math.max(0, Math.ceil((updated.endsAt.getTime() - now.getTime()) / 1000)) : null } });
  }

  if (body.action === "resume") {
    if (existing.status !== "PAUSED" || !existing.pausedAt) return NextResponse.json({ error: "Only paused sessions can be resumed." }, { status: 409 });
    const pauseGap = Math.max(0, Math.floor((now.getTime() - existing.pausedAt.getTime()) / 1000));
    const updated = await prisma.studySession.update({ where: { id }, data: {
      status: "RUNNING", pausedAt: null, pausedSeconds: existing.pausedSeconds + pauseGap,
      endsAt: existing.endsAt ? new Date(existing.endsAt.getTime() + pauseGap * 1000) : null,
      segmentStartedAt: now, phaseStartedAt: existing.phaseStartedAt ? new Date(existing.phaseStartedAt.getTime() + pauseGap * 1000) : now,
      lastHeartbeatAt: now, events: { create: { type: "RESUME" } },
    }, include: includeSession });
    return NextResponse.json({ session: { ...updated, elapsedSeconds: updated.accumulatedSeconds, focusedSeconds: Math.max(0, updated.focusSeconds - updated.awaySeconds), remainingSeconds: updated.endsAt ? Math.max(0, Math.ceil((updated.endsAt.getTime() - now.getTime()) / 1000)) : null } });
  }

  if (body.action === "heartbeat") {
    if (existing.status !== "RUNNING") return NextResponse.json({ session: existing });
    const updated = await prisma.studySession.update({ where: { id }, data: { lastHeartbeatAt: now }, include: includeSession });
    return NextResponse.json({ session: { ...updated, elapsedSeconds: elapsedSeconds(updated, now), focusedSeconds: activeFocusSeconds(updated, now), remainingSeconds: updated.endsAt ? Math.max(0, Math.ceil((updated.endsAt.getTime() - now.getTime()) / 1000)) : null } });
  }

  if (body.action === "event") {
    const type = body.type;
    const tabId = typeof body.tabId === "string" ? body.tabId.slice(0, 80) : null;
    if (!["TAB_HIDDEN", "TAB_VISIBLE"].includes(type)) return NextResponse.json({ error: "Invalid visibility event." }, { status: 400 });
    let awayIncrement = 0;
    if (type === "TAB_VISIBLE" && tabId) {
      const latestEvent = await prisma.studySessionEvent.findFirst({ where: { sessionId: id, tabId, type: { in: ["TAB_HIDDEN", "TAB_VISIBLE"] } }, orderBy: { at: "desc" }, select: { type: true, at: true } });
      if (latestEvent?.type === "TAB_HIDDEN" && latestEvent.at > existing.startedAt) awayIncrement = Math.max(0, Math.floor((now.getTime() - latestEvent.at.getTime()) / 1000));
    }
    await prisma.studySessionEvent.create({ data: { sessionId: id, type, tabId, at: now } });
    const updated = awayIncrement ? await prisma.studySession.update({ where: { id }, data: { awaySeconds: { increment: awayIncrement } }, include: includeSession }) : existing;
    return NextResponse.json({ session: { ...updated, elapsedSeconds: elapsedSeconds(updated, now), focusedSeconds: activeFocusSeconds(updated, now) } });
  }

  if (body.action === "discard") {
    if (!["RUNNING", "PAUSED"].includes(existing.status)) return NextResponse.json({ error: "This session cannot be discarded." }, { status: 409 });
    await prisma.studySession.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  if (body.action === "parking-note") {
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 500) : "";
    if (!text) return NextResponse.json({ error: "Write a thought before saving." }, { status: 400 });
    if (!["RUNNING", "PAUSED"].includes(existing.status)) return NextResponse.json({ error: "This session has ended." }, { status: 409 });
    const note = await prisma.parkingLotNote.create({ data: { sessionId: id, text } });
    const updated = await prisma.studySession.findUnique({ where: { id }, include: includeSession });
    return NextResponse.json({ note, session: updated }, { status: 201 });
  }

  if (body.action === "rate") {
    if (!["COMPLETED", "ABANDONED"].includes(existing.status)) return NextResponse.json({ error: "You can reflect after the session has ended." }, { status: 409 });
    const rating = Number(body.focusRating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Choose a focus rating from 1 to 5." }, { status: 400 });
    const updated = await prisma.studySession.update({ where: { id }, data: { focusRating: rating, goalCompleted: typeof body.goalCompleted === "boolean" ? body.goalCompleted : null }, include: includeSession });
    return NextResponse.json({ session: updated });
  }

  if (body.action === "end" || body.action === "finish") {
    if (!["RUNNING", "PAUSED"].includes(existing.status)) return NextResponse.json({ error: "This session has already ended." }, { status: 409 });
    const reason = body.action === "finish" ? "DONE_EARLY" : body.reason;
    const allowed = ["DONE_EARLY", "INTERRUPTED", "GAVE_UP", "TIMER_COMPLETED"];
    if (!allowed.includes(reason)) return NextResponse.json({ error: "Choose how this session ended." }, { status: 400 });
    if (existing.strictMode && body.action === "end" && !reason) return NextResponse.json({ error: "A reason is required in strict mode." }, { status: 400 });
    const isAbandoned = reason === "INTERRUPTED" || reason === "GAVE_UP";
    const rawSegment = existing.status === "RUNNING" ? runningSeconds : 0;
    const segment = reason === "TIMER_COMPLETED" && existing.endsAt && existing.segmentStartedAt
      ? Math.min(rawSegment, Math.max(0, Math.floor((existing.endsAt.getTime() - existing.segmentStartedAt.getTime()) / 1000)))
      : rawSegment;
    const focusedSegment = existing.mode === "POMODORO"
      ? (existing.pomodoroPhase === "FOCUS" ? (existing.phaseAccumulatedSeconds + segment) : 0)
      : existing.focusSeconds + segment;
    const totalElapsed = existing.accumulatedSeconds + segment;
    const focused = Math.max(0, (existing.mode === "POMODORO" ? existing.focusSeconds + focusedSegment : focusedSegment) - existing.awaySeconds);
    const endedAt = reason === "TIMER_COMPLETED" && existing.endsAt ? existing.endsAt : now;
    const updated = await prisma.studySession.update({ where: { id }, data: {
      status: isAbandoned ? "ABANDONED" : "COMPLETED", endedAt,
      segmentStartedAt: null, pausedAt: null,
      accumulatedSeconds: totalElapsed, focusSeconds: existing.mode === "POMODORO" ? existing.focusSeconds + focusedSegment : focusedSegment,
      phaseAccumulatedSeconds: 0,
      pausedSeconds: existing.pausedSeconds + (existing.status === "PAUSED" && existing.pausedAt ? Math.max(0, Math.floor((now.getTime() - existing.pausedAt.getTime()) / 1000)) : 0),
      durationSeconds: focused, endReason: reason,
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) || null : existing.notes,
      events: { create: { type: "END" } },
    }, include: includeSession });
    return NextResponse.json({ session: updated });
  }

  return NextResponse.json({ error: "Unknown session action." }, { status: 400 });
}

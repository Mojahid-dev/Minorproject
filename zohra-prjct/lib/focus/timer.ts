export type FocusMode = "COUNTDOWN" | "STOPWATCH" | "POMODORO";
export type FocusStatus = "RUNNING" | "PAUSED" | "COMPLETED" | "ABANDONED";
export type FocusPhase = "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";

export type TimerSnapshot = {
  mode: FocusMode;
  status: FocusStatus;
  startedAt: Date;
  segmentStartedAt: Date | null;
  accumulatedSeconds: number;
  pausedSeconds: number;
  awaySeconds: number;
  endsAt: Date | null;
  pausedAt: Date | null;
  pomodoroPhase: FocusPhase | null;
  focusSeconds: number;
  phaseAccumulatedSeconds?: number;
  focusDurationSeconds: number;
};

const secondsBetween = (start: Date, end: Date) =>
  Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));

export function elapsedSeconds(session: TimerSnapshot, now = new Date()) {
  if (session.status !== "RUNNING" || !session.segmentStartedAt)
    return session.accumulatedSeconds;
  return session.accumulatedSeconds + secondsBetween(session.segmentStartedAt, now);
}

export function remainingSeconds(session: TimerSnapshot, now = new Date()) {
  if (session.mode === "STOPWATCH" || !session.endsAt) return null;
  if (session.status === "PAUSED" && session.pausedAt) {
    return Math.max(0, secondsBetween(now, session.endsAt));
  }
  return Math.max(0, Math.ceil((session.endsAt.getTime() - now.getTime()) / 1000));
}

export function activeFocusSeconds(session: TimerSnapshot, now = new Date()) {
  const phaseFocus = session.mode === "POMODORO" && session.pomodoroPhase !== "FOCUS"
    ? 0
    : (session.phaseAccumulatedSeconds ?? 0) + (session.status === "RUNNING" && session.segmentStartedAt ? secondsBetween(session.segmentStartedAt, now) : 0);
  const measured = session.mode === "POMODORO"
    ? session.focusSeconds + phaseFocus
    : elapsedSeconds(session, now);
  return Math.max(0, measured - session.awaySeconds);
}

export function focusScore(session: TimerSnapshot, now = new Date()) {
  const elapsed = elapsedSeconds(session, now);
  // elapsedSeconds() already excludes paused segments because it is accumulated from running segments.
  const denominator = Math.max(0, elapsed);
  if (!denominator) return null;
  return Math.max(0, Math.min(100, Math.round((activeFocusSeconds(session, now) / denominator) * 100)));
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function nextPomodoroPhase(phase: FocusPhase, cycle: number, totalCycles = 4) {
  if (phase === "FOCUS") return cycle % totalCycles === 0 ? "LONG_BREAK" : "SHORT_BREAK";
  return "FOCUS";
}

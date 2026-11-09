"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Maximize2, Pause, Play, Square, X, Minus, Move } from "lucide-react";
import { toast } from "sonner";
import { formatClock } from "@/lib/focus/timer";

type SubjectOption = { id: string; name: string };
type TaskOption = { id: string; title: string };
export type StudySession = {
  id: string;
  mode: "STOPWATCH" | "COUNTDOWN" | "POMODORO";
  status: "RUNNING" | "PAUSED" | "COMPLETED" | "ABANDONED";
  topic: string | null;
  goal?: string | null;
  startedAt: string;
  endedAt?: string | null;
  endsAt?: string | null;
  segmentStartedAt?: string | null;
  pausedAt?: string | null;
  durationSeconds?: number | null;
  accumulatedSeconds: number;
  elapsedSeconds?: number;
  remainingSeconds?: number | null;
  plannedSeconds?: number;
  focusDurationSeconds?: number;
  shortBreakSeconds?: number;
  longBreakSeconds?: number;
  focusedSeconds?: number;
  focusSeconds?: number;
  phaseAccumulatedSeconds?: number;
  awaySeconds?: number;
  pausedSeconds?: number;
  subjectId: string | null;
  taskId: string | null;
  subject: SubjectOption | null;
  task: TaskOption | null;
  notes?: string | null;
  strictMode?: boolean;
  focusMode?: boolean;
  pomodoroPhase?: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK" | null;
  currentCycle?: number;
  parkingLotNotes?: { id: string; text: string; createdAt: string }[];
  focusRating?: number | null;
  goalCompleted?: boolean | null;
};

type StartInput = {
  mode?: "STOPWATCH" | "COUNTDOWN" | "POMODORO";
  plannedSeconds?: number;
  focusDurationSeconds?: number;
  shortBreakSeconds?: number;
  longBreakSeconds?: number;
  subjectId?: string;
  taskId?: string;
  topic?: string;
  goal?: string;
  strictMode?: boolean;
  focusMode?: boolean;
};
type TrackerContextValue = {
  active: StudySession | null;
  sessions: StudySession[];
  completedSession: StudySession | null;
  subjects: SubjectOption[];
  tasks: TaskOption[];
  elapsedSeconds: number;
  remainingSeconds: number | null;
  focusedSeconds: number;
  loading: boolean;
  refresh: () => Promise<void>;
  start: (input: StartInput) => Promise<boolean>;
  pause: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  finish: (notes?: string) => Promise<boolean>;
  end: (reason: "DONE_EARLY" | "INTERRUPTED" | "GAVE_UP" | "TIMER_COMPLETED", notes?: string) => Promise<boolean>;
  discard: () => Promise<boolean>;
  addParkingNote: (text: string) => Promise<boolean>;
  rate: (rating: number, goalCompleted: boolean) => Promise<boolean>;
  clearCompleted: () => void;
};

const TrackerContext = createContext<TrackerContextValue | null>(null);
export function useStudyTracker() {
  const value = useContext(TrackerContext);
  if (!value) throw new Error("useStudyTracker must be used inside StudyTrackerProvider");
  return value;
}

function elapsedFor(active: StudySession | null, now: number) {
  if (!active) return 0;
  if (active.status !== "RUNNING" || !active.segmentStartedAt) return active.accumulatedSeconds;
  return active.accumulatedSeconds + Math.max(0, Math.floor((now - new Date(active.segmentStartedAt).getTime()) / 1000));
}

export function StudyTrackerProvider({ children, showPlayer = true }: { children: React.ReactNode; showPlayer?: boolean }) {
  const [active, setActive] = useState<StudySession | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [completedSession, setCompletedSession] = useState<StudySession | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [serverOffset, setServerOffset] = useState(0);
  const pathname = usePathname();
  const onStudyPage = pathname.startsWith("/study-progress");
  const onFocusPage = pathname === "/focus";

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/focus/sessions", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load focus session.");
      const payload = await response.json();
      if (payload.serverNow) setServerOffset(new Date(payload.serverNow).getTime() - Date.now());
      setActive(payload.active ?? null);
      if (payload.active) setCompletedSession(null);
      const recentSessions = Array.isArray(payload.sessions) ? payload.sessions : [];
      setSessions(recentSessions);
      if (!payload.active && window.location.pathname === "/focus" && recentSessions[0]?.endedAt && Date.now() - new Date(recentSessions[0].endedAt).getTime() < 10 * 60 * 1000) {
        setCompletedSession(recentSessions[0]);
      }
      setSubjects(Array.isArray(payload.subjects) ? payload.subjects : []);
      setTasks(Array.isArray(payload.tasks) ? payload.tasks : []);
    } catch {
      // Keep the workspace usable if the focus API is temporarily unavailable.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sendAction = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    if (action !== "start" && !active) return false;
    try {
      const response = action === "start"
        ? await fetch("/api/focus/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) })
        : await fetch(`/api/focus/sessions/${active!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const payload = await response.json().catch(() => null);
      if (payload?.serverNow) setServerOffset(new Date(payload.serverNow).getTime() - Date.now());
      if (!response.ok) throw new Error(payload?.error || "Unable to update focus session.");
      if (action === "discard") {
        setActive(null);
      } else if (payload?.session) {
        const next = payload.session as StudySession;
        if (action === "start") setCompletedSession(null);
        if (next.status === "COMPLETED" || next.status === "ABANDONED") {
          setCompletedSession(next);
          setSessions((current) => [next, ...current.filter((item) => item.id !== next.id)].slice(0, 30));
          setActive(null);
          window.dispatchEvent(new Event("zohra:study-updated"));
        } else {
          setActive(next);
        }
      }
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("zohra-focus");
        channel.postMessage({ type: "SESSION_CHANGED" });
        channel.close();
      }
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
      return false;
    }
  }, [active]);

  useEffect(() => {
    if (active?.status !== "RUNNING") return;
    const heartbeat = window.setInterval(() => { void sendAction("heartbeat"); }, 30_000);
    return () => window.clearInterval(heartbeat);
  }, [active?.id, active?.status, sendAction]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("zohra-focus");
    channel.onmessage = (event) => { if (event.data?.type === "SESSION_CHANGED") void refresh(); };
    return () => channel.close();
  }, [refresh]);

  useEffect(() => {
    if (!active || active.status !== "RUNNING") return;
    let tabId = sessionStorage.getItem("zohra-focus-tab");
    if (!tabId) { tabId = crypto.randomUUID(); sessionStorage.setItem("zohra-focus-tab", tabId); }
    const postVisibility = async (type: "TAB_HIDDEN" | "TAB_VISIBLE") => {
      try {
        await fetch(`/api/focus/sessions/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "event", type, tabId }), keepalive: type === "TAB_HIDDEN" });
      } catch { /* Visibility telemetry is best-effort; timer accuracy comes from server timestamps. */ }
    };
    const onVisibility = async () => {
      const visible = document.visibilityState === "visible";
      await postVisibility(visible ? "TAB_VISIBLE" : "TAB_HIDDEN");
      if (visible) await refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [active?.id, active?.status, refresh]);

  useEffect(() => {
    if (!active || active.status !== "RUNNING") return;
    type WakeLockLike = { release: () => Promise<void> };
    let lock: WakeLockLike | null = null;
    let cancelled = false;
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockLike> } }).wakeLock;
    const acquire = async () => {
      if (!wakeLock || document.visibilityState !== "visible") return;
      try { const next = await wakeLock.request("screen"); if (cancelled) void next.release(); else lock = next; } catch { /* Wake Lock is progressive enhancement. */ }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", acquire); void lock?.release().catch(() => undefined); };
  }, [active?.id, active?.status]);

  const elapsedSeconds = elapsedFor(active, now + serverOffset);
  const remainingSeconds = active?.endsAt && active.mode !== "STOPWATCH"
    ? Math.max(0, Math.ceil((new Date(active.endsAt).getTime() - (active.status === "PAUSED" && active.pausedAt ? new Date(active.pausedAt).getTime() : now + serverOffset)) / 1000))
    : null;
  const focusedSeconds = active
    ? active.mode === "POMODORO"
      ? Math.max(0, (active.focusSeconds ?? 0) + (active.pomodoroPhase === "FOCUS" ? (active.phaseAccumulatedSeconds ?? 0) + (active.status === "RUNNING" && active.segmentStartedAt ? Math.max(0, Math.floor(((now + serverOffset) - new Date(active.segmentStartedAt).getTime()) / 1000)) : 0) : 0) - (active.awaySeconds ?? 0))
      : Math.max(0, elapsedSeconds - (active.awaySeconds ?? 0))
    : 0;

  useEffect(() => {
    if (!active || active.status !== "RUNNING" || remainingSeconds === null) return;
    if (remainingSeconds > 0) return;
    if (active.mode === "POMODORO") {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Zohra Focus", { body: "Your Pomodoro phase has ended. Your next phase is starting." });
      // GET advances the server-authoritative phase; refreshing here avoids local phase drift.
      void refresh();
    } else {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Zohra Focus", { body: `${active.subject?.name || "Your study session"} is complete.` });
      }
      void sendAction("end", { reason: "TIMER_COMPLETED" });
    }
  }, [active?.id, active?.mode, active?.status, active?.endsAt, active?.pomodoroPhase, remainingSeconds, refresh, sendAction]);

  useEffect(() => {
    if (!active) { document.title = "Zohra"; return; }
    const label = active.subject?.name || "Study";
    const time = remainingSeconds === null ? formatClock(elapsedSeconds) : formatClock(remainingSeconds);
    document.title = `${time} · ${label} | Zohra`;
  }, [active?.id, active?.subject?.name, elapsedSeconds, remainingSeconds]);

  const value = useMemo<TrackerContextValue>(() => ({
    active, sessions, completedSession, subjects, tasks, elapsedSeconds, remainingSeconds, focusedSeconds, loading, refresh,
    start: (input) => sendAction("start", input),
    pause: () => sendAction("pause"),
    resume: () => sendAction("resume"),
    finish: (notes) => sendAction("end", { reason: "DONE_EARLY", notes }),
    end: (reason, notes) => sendAction("end", { reason, notes }),
    discard: () => sendAction("discard"),
    addParkingNote: (text) => sendAction("parking-note", { text }),
    rate: async (focusRating, goalCompleted) => {
      const target = completedSession;
      if (!target) return false;
      try {
        const response = await fetch(`/api/focus/sessions/${target.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rate", focusRating, goalCompleted }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to save your check-in.");
        setCompletedSession(payload.session);
        setSessions((current) => current.map((item) => item.id === target.id ? payload.session : item));
        window.dispatchEvent(new Event("zohra:study-updated"));
        return true;
      } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save check-in."); return false; }
    },
    clearCompleted: () => setCompletedSession(null),
  }), [active, sessions, completedSession, subjects, tasks, elapsedSeconds, remainingSeconds, focusedSeconds, loading, refresh, sendAction]);

  return <TrackerContext.Provider value={value}>
    {children}
    {showPlayer && active && !onStudyPage && !onFocusPage && <PersistentStudyPlayer active={active} elapsedSeconds={elapsedSeconds} remainingSeconds={remainingSeconds} onPause={() => void value.pause()} onResume={() => void value.resume()} onFinish={() => void value.finish()} onDiscard={() => void value.discard()} />}
  </TrackerContext.Provider>;
}

function PersistentStudyPlayer({ active, elapsedSeconds, remainingSeconds, onPause, onResume, onFinish, onDiscard }: {
  active: StudySession; elapsedSeconds: number; remainingSeconds: number | null;
  onPause: () => void; onResume: () => void; onFinish: () => void; onDiscard: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const label = active.subject?.name || "Independent study";
  useEffect(() => {
    const onMenu = (event: Event) => setMenuOpen(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener("zohra:more-menu", onMenu);
    return () => window.removeEventListener("zohra:more-menu", onMenu);
  }, []);
  const display = remainingSeconds === null ? formatClock(elapsedSeconds) : formatClock(remainingSeconds);
  return <aside
    aria-label="Active study session"
    className={`${menuOpen ? "max-sm:pointer-events-none max-sm:translate-y-4 max-sm:opacity-0" : ""} fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] right-3 z-[60] ${collapsed ? "w-[min(13rem,calc(100vw-1.5rem))]" : "w-[min(22rem,calc(100vw-1.5rem))]"} rounded-2xl border border-white/10 bg-[#17181b]/95 p-3 text-white shadow-[0_18px_60px_rgba(0,0,0,.45)] backdrop-blur-xl sm:bottom-6 sm:right-6`}
    style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}
    onPointerDown={(event) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-drag-handle]")) return;
      const startX = event.clientX, startY = event.clientY;
      const rect = event.currentTarget.getBoundingClientRect();
      const move = (e: PointerEvent) => setPosition({ x: Math.max(8, Math.min(window.innerWidth - rect.width - 8, rect.left + e.clientX - startX)), y: Math.max(8, Math.min(window.innerHeight - 70, rect.top + e.clientY - startY)) });
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true });
    }}
  >
    <div className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${active.status === "RUNNING" ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`} />
      <span className="text-[10px] font-bold uppercase tracking-[.14em] text-neutral-400">{active.status === "RUNNING" ? "Session active" : "Session paused"}</span>
      <button data-drag-handle type="button" aria-label="Drag mini timer" className="ml-auto cursor-move rounded-md p-1 text-neutral-500 hover:bg-white/10"><Move size={13}/></button>
      <button type="button" onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "Expand mini timer" : "Collapse mini timer"} className="rounded-md p-1 text-neutral-400 hover:bg-white/10"><Minus size={14}/></button>
      <button type="button" onClick={onDiscard} aria-label="Discard session" className="rounded-md p-1 text-neutral-500 hover:bg-white/10"><X size={14}/></button>
    </div>
    <div className="mt-2 flex items-center justify-between gap-3">
      <div className="min-w-0"><p className="truncate text-sm font-semibold">{label}</p>{!collapsed && <p className="truncate text-xs text-neutral-400">{active.topic || active.task?.title || "Study session"}</p>}</div>
      <p className="shrink-0 font-mono text-xl font-semibold tabular-nums">{display}</p>
    </div>
    {collapsed && <Link href="/focus" className="mt-2 flex h-8 items-center justify-center gap-2 rounded-lg bg-white text-xs font-semibold text-black"><Maximize2 size={12}/> Return to Focus</Link>}
    {!collapsed && <div className="mt-3 flex gap-2">
      {active.status === "RUNNING" ? <button type="button" onClick={onPause} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/15"><Pause size={14}/> Pause</button> : <button type="button" onClick={onResume} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/15"><Play size={14}/> Resume</button>}
      <Link href="/focus" className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-xs font-semibold text-zinc-950 hover:bg-neutral-200"><Maximize2 size={13}/> Return to Focus</Link>
      {active.strictMode ? <Link href="/focus" title="End session" aria-label="Open session controls" className="grid size-9 place-items-center rounded-xl bg-white/10 hover:bg-white/15"><Square size={13}/></Link> : <button type="button" onClick={onFinish} title="End session" aria-label="End session" className="grid size-9 place-items-center rounded-xl bg-white/10 hover:bg-white/15"><Square size={13}/></button>}
    </div>}
  </aside>;
}

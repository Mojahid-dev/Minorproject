"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { Pause, Play, Square, Timer, X } from "lucide-react";
import { toast } from "sonner";

type SubjectOption = { id: string; name: string };
type TaskOption = { id: string; title: string };
type StudySession = {
  id: string;
  mode?: "STOPWATCH";
  status: "RUNNING" | "PAUSED" | "COMPLETED";
  topic: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds?: number | null;
  accumulatedSeconds: number;
  elapsedSeconds?: number;
  subjectId: string | null;
  taskId: string | null;
  subject: SubjectOption | null;
  task: TaskOption | null;
  notes?: string | null;
};
type TrackerContextValue = {
  active: StudySession | null;
  sessions: StudySession[];
  subjects: SubjectOption[];
  tasks: TaskOption[];
  elapsedSeconds: number;
  loading: boolean;
  refresh: () => Promise<void>;
  start: (input: {
    mode?: "STOPWATCH";
    subjectId?: string;
    taskId?: string;
    topic?: string;
  }) => Promise<boolean>;
  pause: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  finish: (notes?: string) => Promise<boolean>;
  discard: () => Promise<boolean>;
};

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function useStudyTracker() {
  const value = useContext(TrackerContext);
  if (!value)
    throw new Error("useStudyTracker must be used inside StudyTrackerProvider");
  return value;
}

function formatDuration(total: number) {
  const safe = Math.max(0, total);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function StudyTrackerProvider({
  children,
  showPlayer = true,
}: {
  children: React.ReactNode;
  showPlayer?: boolean;
}) {
  const [active, setActive] = useState<StudySession | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseElapsed, setBaseElapsed] = useState(0);
  const [anchor, setAnchor] = useState(0);
  const [now, setNow] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/study-sessions", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to load study sessions.");
      const payload = await response.json();
      const nextActive = payload.active as StudySession | null;
      setActive(nextActive);
      setBaseElapsed(nextActive?.elapsedSeconds ?? 0);
      setAnchor(Date.now());
      setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
      setSubjects(Array.isArray(payload.subjects) ? payload.subjects : []);
      setTasks(Array.isArray(payload.tasks) ? payload.tasks : []);
    } catch {
      // Keep the shell usable if analytics endpoints are temporarily unavailable.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedSeconds =
    active?.status === "RUNNING"
      ? baseElapsed +
        // eslint-disable-next-line react-hooks/purity
        Math.max(0, Math.floor(((now || Date.now()) - anchor) / 1000))
      : baseElapsed;

  const sendAction = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      if (action !== "start" && !active) return false;
      try {
        const response = await fetch("/api/study-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            ...(active ? { sessionId: active.id } : {}),
            ...extra,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(payload?.error || "Unable to update study session.");
        if (action === "discard") {
          setActive(null);
          setBaseElapsed(0);
          setAnchor(Date.now());
        } else if (payload?.session) {
          const next = payload.session as StudySession;
          setActive(next);
          setBaseElapsed(next.elapsedSeconds ?? next.accumulatedSeconds ?? 0);
          setAnchor(Date.now());
          if (next.status === "COMPLETED") {
            setSessions((current) =>
              [next, ...current.filter((item) => item.id !== next.id)].slice(
                0,
                20,
              ),
            );
            setActive(null);
            setBaseElapsed(0);
            window.dispatchEvent(new Event("zohra:study-updated"));
          }
        }
        return true;
      } catch (error) {
        if (action !== "heartbeat")
          toast.error(
            error instanceof Error ? error.message : "Something went wrong.",
          );
        return false;
      }
    },
    [active],
  );

  useEffect(() => {
    if (active?.status !== "RUNNING") return;
    const heartbeat = window.setInterval(() => {
      void sendAction("heartbeat");
    }, 30_000);
    return () => window.clearInterval(heartbeat);
  }, [active?.id, active?.status, sendAction]);

  // Keep the session honest on phones: hold the screen awake while the timer runs,
  // and check in the moment the tab becomes visible again (timers are suspended in the background).
  useEffect(() => {
    if (active?.status !== "RUNNING") return;
    type WakeLockSentinelLike = { release: () => Promise<void> };
    let lock: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: {
          request: (type: "screen") => Promise<WakeLockSentinelLike>;
        };
      }
    ).wakeLock;
    const acquire = async () => {
      if (!wakeLock || document.visibilityState !== "visible") return;
      try {
        const next = await wakeLock.request("screen");
        if (cancelled) void next.release().catch(() => undefined);
        else lock = next;
      } catch {
        /* unsupported or denied: the timer still works, it just may sleep with the screen */
      }
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void sendAction("heartbeat");
      void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active?.id, active?.status, sendAction]);

  const value = useMemo<TrackerContextValue>(
    () => ({
      active,
      sessions,
      subjects,
      tasks,
      elapsedSeconds,
      loading,
      refresh,
      start: (input) => sendAction("start", input),
      pause: () => sendAction("pause"),
      resume: () => sendAction("resume"),
      finish: (notes) => sendAction("finish", { notes }),
      discard: () => sendAction("discard"),
    }),
    [
      active,
      sessions,
      subjects,
      tasks,
      elapsedSeconds,
      loading,
      refresh,
      sendAction,
    ],
  );

  return (
    <TrackerContext.Provider value={value}>
      {children}
      {showPlayer && active && (
        <PersistentStudyPlayer
          active={active}
          elapsedSeconds={elapsedSeconds}
          onPause={() => void value.pause()}
          onResume={() => void value.resume()}
          onFinish={() => void value.finish()}
          onDiscard={() => void value.discard()}
        />
      )}
    </TrackerContext.Provider>
  );
}

function PersistentStudyPlayer({
  active,
  elapsedSeconds,
  onPause,
  onResume,
  onFinish,
  onDiscard,
}: {
  active: StudySession;
  elapsedSeconds: number;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  // On phones the "More" menu opens in the same corner; step aside while it is open.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onMenu = (event: Event) =>
      setMenuOpen(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener("zohra:more-menu", onMenu);
    return () => window.removeEventListener("zohra:more-menu", onMenu);
  }, []);
  return (
    <aside
      className={`${menuOpen ? "max-sm:pointer-events-none max-sm:translate-y-4 max-sm:opacity-0" : ""} transition-[opacity,transform] duration-200 fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] right-3 z-[60] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-[#17181b]/95 p-3 text-white shadow-[0_18px_60px_rgba(0,0,0,.45)] backdrop-blur-xl sm:bottom-6 sm:right-6`}
      aria-label="Active study session"
    >
      <div className="flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${active.status === "RUNNING" ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`}
        />
        <span className="text-[10px] font-bold uppercase tracking-[.14em] text-neutral-400">
          {active.status === "RUNNING" ? "Focus session" : "Session paused"}
        </span>
        <Link
          href="/study-progress"
          className="ml-auto text-xs text-neutral-400 hover:text-white"
        >
          Open Focus
        </Link>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Discard this unfinished study session? Its time will not be saved.",
              )
            )
              onDiscard();
          }}
          aria-label="Discard session"
          title="Discard session"
          className="grid size-7 place-items-center rounded-lg text-neutral-500 hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {active.subject?.name || "Independent study"}
          </p>
          <p className="truncate text-xs text-neutral-400">
            {active.topic || active.task?.title || "Focused learning"}
          </p>
        </div>
        <p className="shrink-0 font-mono text-xl font-semibold tabular-nums">
          {formatDuration(elapsedSeconds)}
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        {active.status === "RUNNING" ? (
          <button
            type="button"
            onClick={onPause}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/15"
          >
            <Pause size={14} /> Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={onResume}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/15"
          >
            <Play size={14} /> Resume
          </button>
        )}
        <button
          type="button"
          onClick={onFinish}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-xs font-semibold text-zinc-950 hover:bg-neutral-200"
        >
          <Square size={13} /> Finish
        </button>
      </div>
    </aside>
  );
}

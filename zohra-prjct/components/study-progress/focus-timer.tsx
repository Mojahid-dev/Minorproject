"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { focusRing, panel, primaryButton, secondaryButton } from "@/components/dashboard/shared";
import { useStudyTracker } from "./study-tracker-provider";
import { clock, duration } from "./format";

const field =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground " +
  focusRing;

function AnalogStudyClock({ seconds, running }: { seconds: number; running: boolean }) {
  const safe = Math.max(0, Math.floor(seconds));
  const second = safe % 60;
  const minute = Math.floor(safe / 60) % 60;
  const hour = Math.floor(safe / 3600) % 12;

  const secondAngle = second * 6;
  const minuteAngle = minute * 6 + second * 0.1;
  const hourAngle = hour * 30 + minute * 0.5;

  const ticks = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const angle = (i * 6 * Math.PI) / 180;
        const major = i % 5 === 0;
        const inner = major ? 91 : 96;
        const outer = 105;
        return {
          x1: 120 + Math.sin(angle) * inner,
          y1: 120 - Math.cos(angle) * inner,
          x2: 120 + Math.sin(angle) * outer,
          y2: 120 - Math.cos(angle) * outer,
          major,
        };
      }),
    [],
  );

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div
        className={cn(
          "relative aspect-square rounded-full p-[10px]",
          "bg-gradient-to-br from-violet-500/20 via-border/60 to-violet-500/10",
          "shadow-[0_18px_55px_-28px_rgba(109,40,217,0.45)]",
        )}
      >
        <div className="relative h-full w-full overflow-hidden rounded-full border border-border/80 bg-background shadow-inner">
          <svg
            viewBox="0 0 240 240"
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={`Analog study timer showing ${duration(safe)} elapsed`}
          >
            <circle cx="120" cy="120" r="116" fill="none" stroke="currentColor" strokeOpacity=".05" />
            {ticks.map((tick, i) => (
              <line
                key={i}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke="currentColor"
                strokeOpacity={tick.major ? ".62" : ".24"}
                strokeWidth={tick.major ? "2.8" : "1.15"}
                strokeLinecap="round"
              />
            ))}
            {[12, 3, 6, 9].map((number) => {
              const positions: Record<number, { x: number; y: number }> = {
                12: { x: 120, y: 42 },
                3: { x: 198, y: 124 },
                6: { x: 120, y: 205 },
                9: { x: 42, y: 124 },
              };
              return (
                <text
                  key={number}
                  x={positions[number].x}
                  y={positions[number].y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="currentColor"
                  fillOpacity=".76"
                  fontSize="12"
                  fontWeight="600"
                >
                  {number}
                </text>
              );
            })}
            {/* Hour hand */}
            <line
              x1="120" y1="120" x2="120" y2="78"
              stroke="currentColor" strokeWidth="6" strokeLinecap="round"
              style={{ transform: `rotate(${hourAngle}deg)`, transformOrigin: "120px 120px" }}
            />
            {/* Minute hand */}
            <line
              x1="120" y1="120" x2="120" y2="53"
              stroke="currentColor" strokeWidth="3.8" strokeLinecap="round"
              style={{ transform: `rotate(${minuteAngle}deg)`, transformOrigin: "120px 120px" }}
            />
            {/* Seconds hand */}
            <line
              x1="120" y1="132" x2="120" y2="35"
              stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"
              style={{ transform: `rotate(${secondAngle}deg)`, transformOrigin: "120px 120px" }}
            />
            <circle cx="120" cy="120" r="5.5" fill="#8b5cf6" />
            <circle cx="120" cy="120" r="2" fill="white" />
          </svg>
          <div className="absolute inset-x-0 bottom-[29%] flex flex-col items-center pointer-events-none">
            <span className="rounded-full bg-background/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground shadow-sm">
              elapsed
            </span>
            <span className="mt-1 font-mono text-xl font-semibold tracking-tight text-foreground tabular-nums sm:text-2xl">
              {clock(safe)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className={cn("size-2 rounded-full", running ? "animate-pulse bg-emerald-500" : "bg-amber-500")} />
        {running ? "Timer is running" : "Timer is paused"}
      </div>
    </div>
  );
}

export function FocusTimer({
  todaySeconds,
  goalSeconds,
  initialTaskId,
}: {
  /** Study time already saved today (the running session is added on top). */
  todaySeconds: number;
  goalSeconds: number;
  initialTaskId?: string;
}) {
  const tracker = useStudyTracker();
  const active = tracker.active;
  const [subjectId, setSubjectId] = useState("");
  const [taskId, setTaskId] = useState(initialTaskId ?? "");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const live = todaySeconds + (active ? tracker.elapsedSeconds : 0);
  const goalProgress = Math.min(100, Math.round((live / Math.max(1, goalSeconds)) * 100));
  const subjectName = active?.subject?.name ?? tracker.subjects.find((s) => s.id === subjectId)?.name;
  const sessionName = active?.topic || active?.task?.title || subjectName || "Independent study";

  async function start() {
    setBusy(true);
    const ok = await tracker.start({
      mode: "STOPWATCH",
      subjectId: subjectId || undefined,
      taskId: taskId || undefined,
      topic: topic.trim() || undefined,
    });
    setBusy(false);
    if (ok) {
      setNotes("");
      toast.success("Focus session started. You've got this.");
    }
  }

  async function finish() {
    setBusy(true);
    const ok = await tracker.finish(notes);
    setBusy(false);
    if (ok) {
      setNotes("");
      toast.success("Session saved. Nice work!");
    }
  }

  return (
    <section aria-labelledby="focus-heading" className={cn(panel, "overflow-hidden")}>
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-6">
        <div>
          <h2 id="focus-heading" className="text-base font-semibold tracking-tight text-foreground">
            Focus timer
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A simple clock for your study sessions
          </p>
        </div>
        {active ? (
          <span className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
            active.status === "RUNNING"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
          )}>
            <span className={cn("size-2 rounded-full", active.status === "RUNNING" ? "animate-pulse bg-emerald-500" : "bg-amber-500")} />
            {active.status === "RUNNING" ? "In progress" : "Paused"}
          </span>
        ) : (
          <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">Ready</span>
        )}
      </div>

      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <AnalogStudyClock seconds={active ? tracker.elapsedSeconds : 0} running={active?.status === "RUNNING"} />
          {active ? (
            <div className="mt-5 text-center">
              <p className="text-sm font-semibold text-foreground">{sessionName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {active.status === "RUNNING" ? "Keep going — your study time is being recorded." : "Take your time. Resume when you're ready."}
              </p>
            </div>
          ) : (
            <div className="mt-5 text-center">
              <p className="text-sm font-semibold text-foreground">Ready when you are</p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                Choose a subject or task, then start. The clock will begin counting your focused study time.
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {!active ? (
            <>
              <div>
                <p id="subject-label" className="mb-2 text-xs font-semibold text-foreground">What are you studying?</p>
                <div role="group" aria-labelledby="subject-label" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {[{ id: "", name: "Independent" }, ...tracker.subjects].map((subject) => (
                    <button
                      key={subject.id || "none"}
                      type="button"
                      aria-pressed={subjectId === subject.id}
                      onClick={() => setSubjectId(subject.id)}
                      className={cn(
                        "min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                        subjectId === subject.id
                          ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                          : "border-border bg-background text-foreground hover:bg-muted",
                        focusRing,
                      )}
                    >
                      {subject.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <label className="block text-xs font-semibold text-foreground">
                  Link a task <span className="font-normal text-muted-foreground">(optional)</span>
                  <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={cn(field, "mt-1.5 font-normal")}>
                    <option value="">No linked task</option>
                    {tracker.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-foreground">
                  Topic <span className="font-normal text-muted-foreground">(optional)</span>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    maxLength={140}
                    placeholder="e.g. Database normalization"
                    className={cn(field, "mt-1.5 font-normal")}
                  />
                </label>
              </div>

              <button type="button" onClick={() => void start()} disabled={busy || tracker.loading} className={cn(primaryButton, "h-12 w-full text-base disabled:opacity-60")}>
                <Play size={18} fill="currentColor" aria-hidden="true" /> {busy ? "Starting…" : "Start study session"}
              </button>
              <p className="text-center text-xs leading-5 text-muted-foreground">
                Manual tracking — Zohra only counts sessions you start.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Current session</p>
                <p className="mt-1 truncate text-base font-semibold text-foreground">{sessionName}</p>
                <p className="mt-1 text-xs text-muted-foreground">Elapsed: {duration(tracker.elapsedSeconds)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {active.status === "RUNNING" ? (
                  <button type="button" onClick={() => void tracker.pause()} className={cn(secondaryButton, "h-12")}>
                    <Pause size={17} aria-hidden="true" /> Pause
                  </button>
                ) : (
                  <button type="button" onClick={() => void tracker.resume()} className={cn(secondaryButton, "h-12")}>
                    <Play size={17} aria-hidden="true" /> Resume
                  </button>
                )}
                <button type="button" onClick={() => void finish()} disabled={busy} className={cn(primaryButton, "h-12 disabled:opacity-60")}>
                  <CheckCircle2 size={17} aria-hidden="true" /> {busy ? "Saving…" : "Finish"}
                </button>
              </div>
              <label className="block text-xs font-medium text-muted-foreground">
                What did you cover? <span className="font-normal">(optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder="A quick note for future you…"
                  className={cn(field, "mt-1.5 h-auto resize-y p-3")}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Discard this session? Its time will not be saved.")) void tracker.discard();
                }}
                className="flex min-h-10 w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
              >
                <RotateCcw size={14} aria-hidden="true" /> Discard session
              </button>
            </>
          )}

          <div className="rounded-2xl border border-border/70 bg-background p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Today's study goal</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {duration(live)} <span className="font-normal text-muted-foreground">/ {duration(goalSeconds)}</span>
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-violet-700 dark:text-violet-300">{goalProgress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Today's study goal progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={goalProgress}>
              <div className="h-full rounded-full bg-violet-600 transition-[width] duration-500 dark:bg-violet-400" style={{ width: `${goalProgress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {goalProgress >= 100 ? "Daily goal reached. Great work!" : `${duration(Math.max(0, goalSeconds - live))} left to reach your goal`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

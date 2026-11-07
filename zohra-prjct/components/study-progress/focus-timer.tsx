"use client";

import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  focusRing,
  panel,
  primaryButton,
  secondaryButton,
} from "@/components/dashboard/shared";
import { useStudyTracker } from "./study-tracker-provider";
import { duration } from "./format";

const field =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground " +
  focusRing;

function SessionClock({ seconds }: { seconds: number }) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;

  const parts = hours
    ? [
        { value: String(hours).padStart(2, "0"), label: "hours" },
        { value: String(minutes).padStart(2, "0"), label: "minutes" },
        { value: String(remainder).padStart(2, "0"), label: "seconds" },
      ]
    : [
        { value: String(minutes).padStart(2, "0"), label: "minutes" },
        { value: String(remainder).padStart(2, "0"), label: "seconds" },
      ];

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3"
      role="timer"
      aria-live="off"
      aria-label={`Session elapsed: ${duration(safe)}`}
    >
      {parts.map((part, index) => (
        <div key={part.label} className="flex items-center gap-2 sm:gap-3">
          {index > 0 && (
            <span aria-hidden="true" className="pb-5 text-3xl font-light text-muted-foreground/50 sm:text-4xl">
              :
            </span>
          )}
          <div className="min-w-[4.1rem] text-center sm:min-w-[5.3rem]">
            <div className="rounded-2xl border border-border/80 bg-background/80 px-2 py-3 shadow-sm sm:rounded-3xl sm:px-3 sm:py-4">
              <span className="font-mono text-[2.65rem] font-semibold leading-none tracking-[-0.07em] text-foreground tabular-nums sm:text-5xl">
                {part.value}
              </span>
            </div>
            <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">
              {part.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FocusTimer({
  todaySeconds,
  goalSeconds,
  initialTaskId,
}: {
  /** Completed study time already saved today. */
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

  const liveTodaySeconds = todaySeconds + (active ? tracker.elapsedSeconds : 0);
  const goalProgress = Math.min(
    100,
    Math.round((liveTodaySeconds / Math.max(1, goalSeconds)) * 100),
  );
  const subjectName =
    active?.subject?.name ??
    tracker.subjects.find((subject) => subject.id === subjectId)?.name;
  const sessionTitle =
    active?.topic || active?.task?.title || subjectName || "Independent study";

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
      toast.success("Focus session started. One thing at a time.");
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
    <section
      aria-labelledby="focus-heading"
      className={cn(panel, "min-w-0 overflow-hidden")}
    >
      <div className="border-b border-border/70 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Clock3 size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="focus-heading" className="text-base font-semibold tracking-tight text-foreground">
                Focus timer
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Track the time you spend learning
              </p>
            </div>
          </div>
          {active ? (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                active.status === "RUNNING"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-full",
                  active.status === "RUNNING"
                    ? "animate-pulse bg-emerald-500"
                    : "bg-amber-500",
                )}
              />
              {active.status === "RUNNING" ? "In progress" : "Paused"}
            </span>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              Ready
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
        <div className="rounded-[1.6rem] border border-border/70 bg-gradient-to-b from-violet-500/[0.07] to-transparent px-3 py-6 sm:px-5 sm:py-8">
          {active ? (
            <>
              <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Current session · elapsed time
              </p>
              <div className="mt-5">
                <SessionClock seconds={tracker.elapsedSeconds} />
              </div>
              <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 rounded-full border border-border/70 bg-background/75 px-4 py-2">
                <BookOpen size={14} className="shrink-0 text-violet-600 dark:text-violet-300" aria-hidden="true" />
                <span className="truncate text-sm font-medium text-foreground">{sessionTitle}</span>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {active.status === "RUNNING"
                  ? "Your timer is running. Stay with this task."
                  : "Timer paused. Resume whenever you're ready."}
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <Sparkles size={25} aria-hidden="true" />
              </div>
              <p className="mt-4 text-center text-lg font-semibold tracking-tight text-foreground">
                Ready for a focused session?
              </p>
              <p className="mx-auto mt-1 max-w-sm text-center text-sm leading-6 text-muted-foreground">
                Choose what you're working on, then start the timer. Zohra only counts time when you start a session.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2 text-sm">
                <span className="font-semibold tabular-nums text-foreground">{duration(liveTodaySeconds)}</span>
                <span className="text-muted-foreground">studied today</span>
              </div>
            </>
          )}
        </div>

        {active ? (
          <div className="mx-auto mt-5 max-w-xl space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {active.status === "RUNNING" ? (
                <button
                  type="button"
                  onClick={() => void tracker.pause()}
                  className={cn(secondaryButton, "h-12")}
                >
                  <Pause size={17} aria-hidden="true" /> Pause timer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void tracker.resume()}
                  className={cn(secondaryButton, "h-12")}
                >
                  <Play size={17} aria-hidden="true" /> Resume timer
                </button>
              )}
              <button
                type="button"
                onClick={() => void finish()}
                disabled={busy}
                className={cn(primaryButton, "h-12 disabled:opacity-60")}
              >
                <CheckCircle2 size={17} aria-hidden="true" /> Finish session
              </button>
            </div>
            <label className="block text-xs font-medium text-muted-foreground">
              What did you cover? <span className="font-normal">(optional)</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Add a short note about what you learned…"
                className={cn(field, "mt-1.5 h-auto resize-y p-3")}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Discard this session? Its time will not be saved.",
                  )
                )
                  void tracker.discard();
              }}
              className="flex min-h-10 w-full items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-red-600 dark:hover:text-red-400"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Discard session
            </button>
          </div>
        ) : (
          <div className="mx-auto mt-6 max-w-xl space-y-5">
            <div>
              <p id="subject-label" className="mb-2.5 text-xs font-semibold text-foreground">
                What are you studying?
              </p>
              <div
                role="group"
                aria-labelledby="subject-label"
                className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
              >
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

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-foreground">
                Link a task <span className="font-normal text-muted-foreground">(optional)</span>
                <select
                  value={taskId}
                  onChange={(event) => setTaskId(event.target.value)}
                  className={cn(field, "mt-1.5 font-normal")}
                >
                  <option value="">No linked task</option>
                  {tracker.tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-foreground">
                Topic <span className="font-normal text-muted-foreground">(optional)</span>
                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  maxLength={140}
                  placeholder="e.g. Database normalization"
                  className={cn(field, "mt-1.5 font-normal")}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void start()}
              disabled={busy || tracker.loading}
              className={cn(primaryButton, "h-12 w-full text-base disabled:opacity-60")}
            >
              <Play size={18} fill="currentColor" aria-hidden="true" />
              {busy ? "Starting…" : "Start focus session"}
            </button>
          </div>
        )}

        <div className="mt-7 border-t border-border/70 pt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                Today's progress
              </p>
              <p className="mt-1 text-sm text-foreground">
                <span className="font-semibold tabular-nums">{duration(liveTodaySeconds)}</span>
                <span className="text-muted-foreground"> of {duration(goalSeconds)} daily goal</span>
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-violet-700 dark:text-violet-300">
              {goalProgress}%
            </span>
          </div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Today's study goal progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={goalProgress}
          >
            <div
              className="h-full rounded-full bg-violet-600 transition-[width] duration-500 dark:bg-violet-400"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {goalProgress >= 100
              ? "Daily goal reached. Great work!"
              : `${duration(Math.max(0, goalSeconds - liveTodaySeconds))} left to reach your goal`}
          </p>
        </div>
      </div>
    </section>
  );
}

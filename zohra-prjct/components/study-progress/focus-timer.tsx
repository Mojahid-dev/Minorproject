"use client";

import { useState } from "react";
import { CheckCircle2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { focusRing, panel, primaryButton, secondaryButton } from "@/components/dashboard/shared";
import { useStudyTracker } from "./study-tracker-provider";
import { ProgressRing } from "./progress-ring";
import { clock, duration } from "./format";

const field =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground " + focusRing;

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
  const ratio = live / Math.max(1, goalSeconds);

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
      toast.success("Session started. You've got this.");
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

  const subjectName = active?.subject?.name ?? tracker.subjects.find((s) => s.id === subjectId)?.name;

  return (
    <section aria-labelledby="focus-heading" className={cn(panel, "p-4 sm:p-6")}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="focus-heading" className="text-base font-semibold tracking-tight text-foreground">
          {active ? (active.status === "PAUSED" ? "Paused" : "Focusing") : "Start a session"}
        </h2>
        {active && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              active.status === "RUNNING"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full", active.status === "RUNNING" ? "bg-emerald-500 motion-safe:animate-pulse" : "bg-amber-500")}
            />
            {active.status === "RUNNING" ? "Running" : "Paused"}
          </span>
        )}
      </div>

      <div className="mt-4">
        <ProgressRing
          value={ratio}
          label={`${duration(live)} studied today of a ${duration(goalSeconds)} goal`}
        >
          {active ? (
            <>
              <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl">
                {clock(tracker.elapsedSeconds)}
              </p>
              <p className="mt-1.5 max-w-[11rem] truncate text-sm text-muted-foreground">
                {active.topic || active.task?.title || subjectName || "Independent study"}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Today</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-foreground">{duration(live)}</p>
              <p className="mt-1 text-sm text-muted-foreground">of {duration(goalSeconds)} goal</p>
            </>
          )}
        </ProgressRing>
      </div>

      {!active ? (
        <div className="mx-auto mt-5 max-w-lg space-y-4">
          <div>
            <p id="subject-label" className="mb-2 text-xs font-medium text-muted-foreground">
              What are you studying?
            </p>
            <div role="group" aria-labelledby="subject-label" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {[{ id: "", name: "Independent" }, ...tracker.subjects].map((subject) => (
                <button
                  key={subject.id || "none"}
                  type="button"
                  aria-pressed={subjectId === subject.id}
                  onClick={() => setSubjectId(subject.id)}
                  className={cn(
                    "min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium motion-safe:transition-colors",
                    subjectId === subject.id
                      ? "border-violet-600 bg-violet-600 text-violet-50"
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
            <label className="block text-xs font-medium text-muted-foreground">
              Task (optional)
              <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={cn(field, "mt-1.5")}>
                <option value="">No linked task</option>
                {tracker.tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Topic (optional)
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={140}
                placeholder="e.g. Normalization"
                className={cn(field, "mt-1.5")}
              />
            </label>
          </div>

          <button type="button" onClick={() => void start()} disabled={busy || tracker.loading} className={cn(primaryButton, "h-12 w-full text-base disabled:opacity-60")}>
            <Play size={18} fill="currentColor" aria-hidden="true" /> Start studying
          </button>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            A manual timer. Zohra only counts the sessions you start.
          </p>
        </div>
      ) : (
        <div className="mx-auto mt-5 max-w-lg space-y-3">
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
              <CheckCircle2 size={17} aria-hidden="true" /> Finish
            </button>
          </div>
          <label className="block text-xs font-medium text-muted-foreground">
            What did you cover? (optional)
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
            className="block min-h-10 w-full text-sm text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
          >
            Discard this session
          </button>
        </div>
      )}
    </section>
  );
}

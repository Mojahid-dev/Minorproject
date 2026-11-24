"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudyTracker, type StudySession } from "./study-tracker-provider";
import { markTaskPrompted, setTaskCompleted, shouldAskAboutTask } from "./task-completion";
import { duration } from "./format";

type Stage = "ask" | "done" | "skipped";

/**
 * After a session linked to a task ends, ask one clear question: is the task finished?
 * One tap marks it done, one tap undoes it. Time studied alone never completes a task.
 */
export function TaskDoneCard({ session, tone = "light" }: { session: StudySession; tone?: "light" | "dark" }) {
  const tracker = useStudyTracker();
  const [stage, setStage] = useState<Stage>("ask");
  // Decided once, when the card first appears, so answering it doesn't make it vanish.
  const [eligible] = useState(() => shouldAskAboutTask(session));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!eligible || !session.task || stage === "skipped") return null;
  const task = session.task;
  const dark = tone === "dark";
  const next = tracker.tasks.find((item) => item.id !== task.id);

  async function change(completed: boolean) {
    setBusy(true);
    setError("");
    const ok = await setTaskCompleted(task.id, completed);
    setBusy(false);
    if (!ok) {
      setError("Couldn't update the task. Try again from the Tasks page.");
      return;
    }
    markTaskPrompted(session.id);
    setStage(completed ? "done" : "ask");
    void tracker.refresh();
  }

  const shell = cn(
    "rounded-2xl border p-4 text-left",
    dark ? "border-white/10 bg-black/20" : "border-emerald-500/25 bg-emerald-500/5",
  );
  const muted = dark ? "text-neutral-400" : "text-muted-foreground";
  const strong = dark ? "text-white" : "text-foreground";

  if (stage === "done") {
    return (
      <div className={shell} role="status">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-emerald-50">
            <Check size={16} strokeWidth={3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold", strong)}>Task completed</p>
            <p className={cn("mt-0.5 truncate text-sm", muted)}>{task.title}</p>
          </div>
          <button
            type="button"
            onClick={() => void change(false)}
            disabled={busy}
            className={cn("inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold disabled:opacity-60", dark ? "bg-white/10 hover:bg-white/15" : "bg-muted hover:bg-muted/70", strong)}
          >
            <Undo2 size={14} aria-hidden="true" /> Undo
          </button>
        </div>
        {next && (
          <Link
            href={`/study-progress?taskId=${next.id}`}
            onClick={tracker.clearCompleted}
            className={cn("mt-3 flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 text-sm", dark ? "border-white/10 hover:bg-white/5" : "border-border hover:bg-muted")}
          >
            <span className="min-w-0 truncate"><span className={muted}>Next up: </span><span className={cn("font-medium", strong)}>{next.title}</span></span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-violet-600 dark:text-violet-300">Focus <ArrowRight size={14} aria-hidden="true" /></span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={shell}>
      <p className={cn("text-sm font-semibold", strong)}>Is this task finished?</p>
      <p className={cn("mt-1 text-sm", muted)}>
        <span className={cn("font-medium", strong)}>{task.title}</span> · you studied {duration(session.durationSeconds ?? session.accumulatedSeconds)} for it
      </p>
      {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void change(true)}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-emerald-50 hover:bg-emerald-500 disabled:opacity-60"
        >
          <Check size={16} aria-hidden="true" /> {busy ? "Saving…" : "Yes, mark done"}
        </button>
        <button
          type="button"
          onClick={() => {
            markTaskPrompted(session.id);
            setStage("skipped");
          }}
          className={cn("min-h-11 rounded-xl border px-3 text-sm font-medium", dark ? "border-white/15 text-neutral-200 hover:bg-white/5" : "border-border text-foreground hover:bg-muted")}
        >
          Not yet
        </button>
      </div>
    </div>
  );
}

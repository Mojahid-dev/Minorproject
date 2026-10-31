"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check, CircleAlert, PartyPopper, Plus } from "lucide-react";
import type { TaskRecord } from "@/lib/task-utils";
import { overdueLabel, plural, type TaskGroups } from "@/lib/dashboard-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { InlineError, PanelHeader, focusRing, panel } from "./shared";

type Props = {
  groups: TaskGroups;
  today: string | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onToggle: (task: TaskRecord) => void;
  onAdd: (title: string) => Promise<void>;
};

function TaskItem({
  task,
  today,
  onToggle,
}: {
  task: TaskRecord;
  today: string;
  onToggle: (task: TaskRecord) => void;
}) {
  const done = Boolean(task.completedAt);
  const late = !done && task.dueDate && task.dueDate < today;

  return (
    <li className="flex items-center gap-1 rounded-xl pr-2 motion-safe:transition-colors hover:bg-muted/60">
      {/* 44px hit area around a 20px visual control. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={task.title}
        onClick={() => onToggle(task)}
        className={cn("grid size-11 shrink-0 place-items-center rounded-xl", focusRing)}
      >
        <span
          className={cn(
            "grid size-5 place-items-center rounded-full border-2 motion-safe:transition-colors",
            done
              ? "border-emerald-600 bg-emerald-600 text-emerald-50"
              : "border-muted-foreground/60",
          )}
        >
          {done && <Check size={13} strokeWidth={3} aria-hidden="true" />}
        </span>
      </button>
      <span
        className={cn(
          "min-w-0 flex-1 py-2 text-sm leading-snug",
          done ? "text-muted-foreground line-through" : "text-foreground",
        )}
      >
        <span className="line-clamp-2">{task.title}</span>
      </span>
      {late && task.dueDate && (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-destructive">
          <CircleAlert size={13} aria-hidden="true" />
          {overdueLabel(task.dueDate, today)}
        </span>
      )}
    </li>
  );
}

function AddTask({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      await onAdd(value);
      setTitle("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add task.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <div className="flex items-center gap-2">
        <label htmlFor="dashboard-new-task" className="sr-only">
          Add a task for today
        </label>
        <input
          id="dashboard-new-task"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={180}
          placeholder="Add a task for today…"
          autoComplete="off"
          className={cn(
            "min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground",
            focusRing,
          )}
        />
        <button
          type="submit"
          disabled={!title.trim() || busy}
          aria-label="Add task"
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-violet-50 motion-safe:transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
            focusRing,
          )}
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

export function TodayPanel({
  groups,
  today,
  loading,
  error,
  onRetry,
  onToggle,
  onAdd,
}: Props) {
  const isLoading = loading || !today;
  const total = groups.today.length;
  const done = groups.today.filter((task) => task.completedAt).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total && groups.overdue.length === 0;
  const isEmpty = total === 0 && groups.overdue.length === 0;

  return (
    <section aria-labelledby="today-heading" className={cn(panel, "p-4 sm:p-5")}>
      <PanelHeader
        id="today-heading"
        title="Today"
        description={
          isLoading || error
            ? undefined
            : allDone
              ? "Everything for today is done."
              : total
                ? `${done} of ${plural(total, "task")} done`
                : undefined
        }
        action={
          today && (
            <Link
              href={`/tasks?date=${today}`}
              className={cn(
                "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-500/10 dark:text-violet-300",
                focusRing,
              )}
            >
              Open planner <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )
        }
      />

      {total > 0 && !isLoading && (
        <div
          role="progressbar"
          aria-label="Today's task completion"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-emerald-600 motion-safe:transition-[width] motion-safe:duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <div className="mt-3">
        {isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading tasks">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={onRetry} />
        ) : (
          <>
            {groups.overdue.length > 0 && (
              <div className="mb-3">
                <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-destructive">
                  Overdue · {groups.overdue.length}
                </h3>
                <ul>
                  {groups.overdue.map((task) => (
                    <TaskItem key={task.id} task={task} today={today} onToggle={onToggle} />
                  ))}
                </ul>
              </div>
            )}

            {groups.today.length > 0 && (
              <div>
                {groups.overdue.length > 0 && (
                  <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Due today
                  </h3>
                )}
                <ul>
                  {groups.today.map((task) => (
                    <TaskItem key={task.id} task={task} today={today} onToggle={onToggle} />
                  ))}
                </ul>
              </div>
            )}

            {allDone && (
              <p className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                <PartyPopper size={18} aria-hidden="true" /> You&apos;re all caught up. Nice work.
              </p>
            )}

            {isEmpty && (
              <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
                <p className="text-sm font-medium text-foreground">Nothing planned for today</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add the one thing you want to finish, or plan ahead in the calendar.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {!isLoading && !error && <AddTask onAdd={onAdd} />}
    </section>
  );
}

"use client";

import { CheckCheck, Flame } from "lucide-react";
import { plural } from "@/lib/dashboard-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PanelHeader, panel } from "@/components/dashboard/shared";

type Props = {
  loading: boolean;
  /** Tasks due today (open and done). */
  total: number;
  done: number;
  overdue: number;
  doneThisWeek: number;
  onShowOverdue: () => void;
};

/** One place for the numbers that used to be repeated in tiles, a hero and a side card. */
export function ProgressPanel({ loading, total, done, overdue, doneThisWeek, onShowOverdue }: Props) {
  const left = total - done;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const headline =
    total === 0 ? "Nothing due today" : left === 0 ? "All done for today" : `${left} to go`;

  return (
    <section aria-labelledby="progress-heading" className={cn(panel, "p-4 sm:p-5")}>
      <PanelHeader id="progress-heading" title="Today's progress" />

      {loading ? (
        <div className="mt-3 space-y-3" aria-busy="true" aria-label="Loading progress">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-2" />
        </div>
      ) : (
        <>
          <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {total ? `${done} of ${plural(total, "task")} complete` : "Add a task to plan your day."}
          </p>
          <div
            role="progressbar"
            aria-label="Today's task completion"
            aria-valuemin={0}
            aria-valuemax={Math.max(total, 1)}
            aria-valuenow={done}
            className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-emerald-600 motion-safe:transition-[width] motion-safe:duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/60 px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCheck size={13} aria-hidden="true" /> Done this week
              </dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{doneThisWeek}</dd>
            </div>
            <div
              className={cn(
                "rounded-xl px-3 py-2.5",
                overdue ? "bg-destructive/10" : "bg-muted/60",
              )}
            >
              <dt
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  overdue ? "text-destructive" : "text-muted-foreground",
                )}
              >
                <Flame size={13} aria-hidden="true" /> Overdue
              </dt>
              <dd
                className={cn(
                  "mt-0.5 text-xl font-semibold tabular-nums",
                  overdue ? "text-destructive" : "text-foreground",
                )}
              >
                {overdue}
              </dd>
            </div>
          </dl>

          {overdue > 0 && (
            <button
              type="button"
              onClick={onShowOverdue}
              className="mt-3 inline-flex min-h-9 items-center rounded-lg text-sm font-semibold text-violet-700 hover:underline focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:text-violet-300"
            >
              Review overdue tasks
            </button>
          )}
        </>
      )}
    </section>
  );
}

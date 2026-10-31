"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { TaskRecord } from "@/lib/task-utils";
import { addDays, parseDateOnly, plural } from "@/lib/dashboard-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PanelHeader, focusRing, panel } from "../../../zohra-prjct/components/dashboard/shared";

type Props = {
  tasks: TaskRecord[];
  upcoming: TaskRecord[];
  today: string | null;
  loading: boolean;
};

const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function WeekStrip({ tasks, upcoming, today, loading }: Props) {
  const isLoading = loading || !today;
  const days = today
    ? Array.from({ length: 7 }, (_, index) => {
        const key = addDays(today, index);
        const date = parseDateOnly(key);
        const open = tasks.filter((task) => task.dueDate === key && !task.completedAt).length;
        return { key, date, open, isToday: index === 0 };
      })
    : [];

  return (
    <section aria-labelledby="week-heading" className={cn(panel, "p-4 sm:p-5")}>
      <PanelHeader id="week-heading" title="Next 7 days" />

      {isLoading ? (
        <Skeleton className="mt-3 h-[76px]" aria-label="Loading schedule" />
      ) : (
        <>
          <ul className="mt-3 grid grid-cols-7 gap-1">
            {days.map(({ key, date, open, isToday }) => (
              <li key={key}>
                <Link
                  href={`/calendar?date=${key}`}
                  aria-label={`${longDate.format(date)}: ${open ? `${plural(open, "open task")}` : "no open tasks"}`}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "flex min-h-[72px] flex-col items-center justify-between rounded-xl border py-2 text-center motion-safe:transition-colors",
                    isToday
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-transparent hover:bg-muted",
                    focusRing,
                  )}
                >
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {weekday.format(date)}
                  </span>
                  <span className="text-base font-semibold text-foreground">
                    {date.getDate()}
                  </span>
                  <span
                    className={cn(
                      "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold",
                      open
                        ? "bg-violet-600 text-violet-50"
                        : "text-muted-foreground/50",
                    )}
                    aria-hidden="true"
                  >
                    {open || "·"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-border pt-3">
            {upcoming.length ? (
              <ul className="space-y-1">
                {upcoming.slice(0, 3).map((task) => (
                  <li key={task.id} className="flex items-baseline gap-3 text-sm">
                    <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">
                      {task.dueDate ? weekday.format(parseDateOnly(task.dueDate)) : ""}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing scheduled this week.</p>
            )}
            <Link
              href="/calendar"
              className={cn(
                "mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300",
                focusRing,
              )}
            >
              Open calendar <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

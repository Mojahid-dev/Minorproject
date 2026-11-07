"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusRing, panel } from "@/components/dashboard/shared";
import { currentMonthKey, type CalendarData } from "./use-study-calendar";
import { dateLabel, duration, monthLabel, shiftMonth } from "./format";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
type CalendarCell =
  | { blank: true; key: string }
  | (CalendarData["days"][number] & { key: string });

// Shade is relative to the student's own daily goal, so the darkest square always means "goal reached".
// (Light-theme-safe: no white text utilities, which the shell remaps.)
const LEVELS = [
  "bg-muted/70 text-muted-foreground",
  "bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-100",
  "bg-violet-200 text-violet-950 dark:bg-violet-500/40 dark:text-violet-50",
  "bg-violet-400 text-violet-50 dark:bg-violet-500/70 dark:text-violet-50",
  "bg-violet-600 text-violet-50 dark:bg-violet-500 dark:text-violet-50",
];

function level(seconds: number, goalSeconds: number) {
  if (seconds <= 0) return 0;
  const ratio = seconds / Math.max(1, goalSeconds);
  if (ratio >= 1) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

export function MonthHeatmap({
  month,
  onMonth,
  data,
  loading,
  error,
  onRetry,
}: {
  month: string;
  onMonth: (month: string) => void;
  data: CalendarData | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const thisMonth = currentMonthKey();
  const [selected, setSelected] = useState<string | null>(null);

  // Picking another month starts with a clean selection (today, when it is in view).
  useEffect(() => {
    setSelected(data && data.today.startsWith(month) ? data.today : null);
  }, [month, data?.today]); // eslint-disable-line react-hooks/exhaustive-deps

  const cells = useMemo<CalendarCell[]>(() => {
    if (!data) return [];
    const lead = (new Date(`${data.days[0].date}T12:00:00`).getDay() + 6) % 7;
    return [
      ...Array.from({ length: lead }, (_, i) => ({ blank: true as const, key: `b${i}` })),
      ...data.days.map((day) => ({ ...day, key: day.date })),
    ];
  }, [data]);

  const picked = data?.days.find((day) => day.date === selected) ?? null;
  const goal = data?.goalSeconds ?? 7200;

  return (
    <section aria-labelledby="month-heading" className={cn(panel, "p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="month-heading" className="text-base font-semibold tracking-tight text-foreground">
            {monthLabel(month)}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {data ? `${duration(data.totalSeconds)} studied this month` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonth(shiftMonth(month, -1))}
            aria-label="Previous month"
            className={cn("grid size-11 place-items-center rounded-xl border border-border text-foreground hover:bg-muted", focusRing)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onMonth(shiftMonth(month, 1))}
            disabled={month >= thisMonth}
            aria-label="Next month"
            className={cn("grid size-11 place-items-center rounded-xl border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent", focusRing)}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}{" "}
          <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" aria-label={`${monthLabel(month)} study calendar`}>
            {WEEKDAYS.map((d, i) => (
              <div key={i} role="columnheader" className="pb-1 text-center text-[11px] font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
            {loading && !data
              ? Array.from({ length: 35 }, (_, i) => <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted/60" />)
              : cells.map((cell) => {
                  if ("blank" in cell) return <div key={cell.key} aria-hidden="true" />;
                  const day = Number(cell.date.slice(8));
                  const isToday = cell.date === data?.today;
                  const future = Boolean(data && cell.date > data.today);
                  const isSelected = cell.date === selected;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      role="gridcell"
                      disabled={future}
                      onClick={() => setSelected(cell.date)}
                      aria-pressed={isSelected}
                      aria-label={`${dateLabel(cell.date)}: ${duration(cell.seconds)} studied${cell.completedTasks ? `, ${cell.completedTasks} tasks done` : ""}`}
                      className={cn(
                        "relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-semibold tabular-nums motion-safe:transition-transform",
                        LEVELS[level(cell.seconds, goal)],
                        future && "opacity-35",
                        !future && "active:scale-95",
                        isToday && "ring-2 ring-violet-600 ring-offset-2 ring-offset-card dark:ring-violet-300",
                        isSelected && !isToday && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                        focusRing,
                      )}
                    >
                      {day}
                      {cell.completedTasks > 0 && (
                        <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span>Less</span>
              {LEVELS.map((cls, i) => (
                <i key={i} className={cn("size-3.5 rounded", cls.split(" ").filter((c) => c.startsWith("bg-") || c.startsWith("dark:bg-")).join(" "))} />
              ))}
              <span>Goal reached</span>
            </div>
            <span className="flex items-center gap-1.5">
              <i aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" /> Task completed
            </span>
          </div>

          <div className="mt-4 rounded-xl bg-muted/50 p-3.5" aria-live="polite">
            {picked ? (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{dateLabel(picked.date)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {picked.sessions} session{picked.sessions === 1 ? "" : "s"} · {picked.completedTasks} task
                    {picked.completedTasks === 1 ? "" : "s"} done
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold tabular-nums text-foreground">{duration(picked.seconds)}</p>
                  <p className="text-xs text-muted-foreground">{Math.min(100, Math.round((picked.seconds / goal) * 100))}% of goal</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tap a day to see what you did.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

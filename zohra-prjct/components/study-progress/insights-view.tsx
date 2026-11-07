"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { focusRing, panel } from "@/components/dashboard/shared";
import { dateLabel, duration } from "./format";

export type Analytics = {
  range: number;
  todaySeconds: number;
  totalSeconds: number;
  previousSeconds: number;
  tasksCompleted: number;
  sessionCount: number;
  activeDays: number;
  averageSessionSeconds: number;
  weekSeconds: number;
  dailyGoalSeconds: number;
  weeklyGoalSeconds: number;
  daily: { date: string; seconds: number; completedTasks: number }[];
  bySubject?: { id: string | null; name: string; seconds: number }[];
};

type Bucket = { date: string; seconds: number; completedTasks: number; title: string; label: string };

function bucketize(daily: Analytics["daily"], days: number): Bucket[] {
  if (days <= 30) {
    return daily.map((d, i) => ({
      ...d,
      title: dateLabel(d.date),
      label:
        days <= 7
          ? new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(`${d.date}T12:00:00`))
          : i % 3 === 0
            ? String(Number(d.date.slice(8)))
            : "",
    }));
  }
  const weeks = new Map<string, { date: string; seconds: number; completedTasks: number }>();
  for (const d of daily) {
    const day = new Date(`${d.date}T12:00:00`);
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const week = weeks.get(key) ?? { date: key, seconds: 0, completedTasks: 0 };
    week.seconds += d.seconds;
    week.completedTasks += d.completedTasks;
    weeks.set(key, week);
  }
  return [...weeks.values()].map((w, i) => ({
    ...w,
    title: `Week of ${dateLabel(w.date)}`,
    label: i % 2 === 0 ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${w.date}T12:00:00`)) : "",
  }));
}

/** Tap-friendly bar chart. Every bar is a button, so values don't depend on hover. */
function BarChart({
  buckets,
  value,
  format,
  tone,
  height,
  goalLine,
  noun,
}: {
  buckets: Bucket[];
  value: (b: Bucket) => number;
  format: (n: number) => string;
  tone: string;
  height: number;
  goalLine?: number;
  noun: string;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const max = Math.max(1, goalLine ?? 0, ...buckets.map(value));
  const current = buckets.find((b) => b.date === picked);
  return (
    <div>
      <p className="h-5 text-sm text-muted-foreground" aria-live="polite">
        {current ? (
          <>
            <span className="font-semibold text-foreground">{format(value(current))}</span> · {current.title}
          </>
        ) : (
          "Tap a bar for details"
        )}
      </p>
      <div className="relative mt-3" style={{ height }}>
        {goalLine ? (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-dashed border-violet-500/60"
            style={{ bottom: `${(goalLine / max) * 100}%` }}
          >
            <span className="absolute -top-4 right-0 text-[10px] font-medium text-violet-700 dark:text-violet-300">goal</span>
          </div>
        ) : null}
        <div className="absolute inset-0 flex items-end gap-[3px] sm:gap-1.5">
          {buckets.map((b) => {
            const v = value(b);
            const isPicked = b.date === picked;
            return (
              <button
                key={b.date}
                type="button"
                onClick={() => setPicked(isPicked ? null : b.date)}
                aria-pressed={isPicked}
                aria-label={`${b.title}: ${format(v)} ${noun}`}
                className={cn("group flex h-full min-w-0 flex-1 items-end rounded-md", focusRing)}
              >
                <span
                  className={cn(
                    "block w-full rounded-t-md motion-safe:transition-colors",
                    v > 0 ? tone : "bg-muted",
                    isPicked && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                  )}
                  style={{ height: `${v > 0 ? Math.max(4, (v / max) * 100) : 2}%` }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex gap-[3px] sm:gap-1.5" aria-hidden="true">
        {buckets.map((b) => (
          <span key={b.date} className="h-3.5 min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[10px] text-muted-foreground">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, loading }: { label: string; value: string; sub: React.ReactNode; loading: boolean }) {
  return (
    <div className={cn(panel, "p-4")}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 whitespace-nowrap text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl lg:text-xl xl:text-2xl">{loading ? "…" : value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

export function InsightsView({
  analytics,
  days,
  onDays,
  loading,
}: {
  analytics: Analytics | null;
  days: number;
  onDays: (days: number) => void;
  loading: boolean;
}) {
  const buckets = useMemo(() => bucketize(analytics?.daily ?? [], days), [analytics, days]);
  const delta = analytics ? analytics.totalSeconds - analytics.previousSeconds : 0;
  const total = analytics?.totalSeconds ?? 0;
  const subjects = analytics?.bySubject ?? [];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Your last {days} days</h2>
        <div role="group" aria-label="Time range" className="flex rounded-xl border border-border bg-card p-1">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={days === value}
              onClick={() => onDays(value)}
              className={cn(
                "min-h-9 rounded-lg px-3 text-sm font-medium motion-safe:transition-colors",
                days === value ? "bg-violet-600 text-violet-50" : "text-muted-foreground hover:text-foreground",
                focusRing,
              )}
            >
              {value}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Study time"
          loading={loading && !analytics}
          value={duration(total)}
          sub={
            analytics && analytics.previousSeconds + total > 0 ? (
              <span className={delta >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>
                {delta >= 0 ? "▲" : "▼"} {duration(Math.abs(delta))} vs previous {days}d
              </span>
            ) : (
              "Start a session to see this"
            )
          }
        />
        <Stat label="Sessions" loading={loading && !analytics} value={String(analytics?.sessionCount ?? 0)} sub={analytics?.sessionCount ? `${duration(analytics.averageSessionSeconds)} average` : "None yet"} />
        <Stat label="Tasks done" loading={loading && !analytics} value={String(analytics?.tasksCompleted ?? 0)} sub="Marked complete" />
        <Stat label="Active days" loading={loading && !analytics} value={analytics ? `${analytics.activeDays}/${days}` : "—"} sub="Study or tasks" />
      </div>

      <section aria-labelledby="study-chart" className={cn(panel, "p-4 sm:p-5")}>
        <h3 id="study-chart" className="text-base font-semibold tracking-tight text-foreground">
          Study time
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{days > 30 ? "Per week" : "Per day"} · dashed line is your goal</p>
        <div className="mt-3">
          <BarChart
            buckets={buckets}
            value={(b) => b.seconds}
            format={duration}
            tone="bg-violet-500 dark:bg-violet-400"
            height={168}
            goalLine={days > 30 ? analytics?.weeklyGoalSeconds : analytics?.dailyGoalSeconds}
            noun="studied"
          />
        </div>
      </section>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <section aria-labelledby="subject-chart" className={cn(panel, "p-4 sm:p-5")}>
          <h3 id="subject-chart" className="text-base font-semibold tracking-tight text-foreground">
            By subject
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Where your time went</p>
          {subjects.length === 0 ? (
            <p className="mt-4 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
              Pick a subject when you start a session to see this fill up.
            </p>
          ) : (
            <ul className="mt-4 space-y-3.5">
              {subjects.slice(0, 6).map((s) => {
                const pct = total ? Math.round((s.seconds / total) * 100) : 0;
                return (
                  <li key={s.id ?? "none"}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-foreground">{s.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {duration(s.seconds)} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="presentation">
                      <div className="h-full rounded-full bg-violet-500 dark:bg-violet-400" style={{ width: `${Math.max(3, pct)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="task-chart" className={cn(panel, "p-4 sm:p-5")}>
          <h3 id="task-chart" className="text-base font-semibold tracking-tight text-foreground">
            Tasks completed
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{days > 30 ? "Per week" : "Per day"}</p>
          <div className="mt-3">
            <BarChart
              buckets={buckets}
              value={(b) => b.completedTasks}
              format={(n) => `${n} task${n === 1 ? "" : "s"}`}
              tone="bg-emerald-500 dark:bg-emerald-400"
              height={120}
              noun="completed"
            />
          </div>
        </section>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        These numbers show effort recorded in Zohra. They are not a measure of mastery or exam results.
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Flame, Minus, Plus, Save, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { focusRing, panel, secondaryButton } from "@/components/dashboard/shared";
import { useStudyTracker } from "@/components/study-progress/study-tracker-provider";
import { FocusTimer } from "@/components/study-progress/focus-timer";
import { InsightsView, type Analytics } from "@/components/study-progress/insights-view";
import { MonthHeatmap } from "@/components/study-progress/month-heatmap";
import { currentMonthKey, useStudyCalendar } from "@/components/study-progress/use-study-calendar";
import { duration } from "@/components/study-progress/format";

type Goal = { dailyTargetMinutes: number; weeklyTargetMinutes: number };
type Tab = "focus" | "insights";

function Meter({ label, value, goal, tone }: { label: string; value: number; goal: number; tone: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, goal)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{duration(value)}</span> / {duration(goal)}
        </span>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`${label} goal`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className={cn("h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{duration(value * 60)}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => set(value - step)}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className={cn("grid size-11 place-items-center rounded-xl border border-border hover:bg-muted disabled:opacity-40", focusRing)}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => set(Number(e.target.value) || min)}
          aria-label={`${label} in minutes`}
          className={cn("h-11 w-[4.5rem] rounded-xl border border-border bg-background px-2 text-center text-sm font-semibold tabular-nums text-foreground", focusRing)}
        />
        <button
          type="button"
          onClick={() => set(value + step)}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className={cn("grid size-11 place-items-center rounded-xl border border-border hover:bg-muted disabled:opacity-40", focusRing)}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function StudyProgressPage() {
  const tracker = useStudyTracker();
  const [tab, setTab] = useState<Tab>("focus");
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [goal, setGoal] = useState<Goal>({ dailyTargetMinutes: 120, weeklyTargetMinutes: 600 });
  const [savedGoal, setSavedGoal] = useState<Goal>({ dailyTargetMinutes: 120, weeklyTargetMinutes: 600 });
  const [goalSaving, setGoalSaving] = useState(false);
  const [month, setMonth] = useState(currentMonthKey());
  const [initialTaskId, setInitialTaskId] = useState<string | undefined>();
  const calendar = useStudyCalendar(month);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (view === "analytics" || view === "insights") setTab("insights");
    setInitialTaskId(params.get("taskId") ?? undefined);
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const [a, g] = await Promise.all([
        fetch(`/api/study-analytics?days=${days}&timeZone=${encodeURIComponent(timeZone)}`, { cache: "no-store" }),
        fetch("/api/study-goals", { cache: "no-store" }),
      ]);
      if (!a.ok || !g.ok) throw new Error("Unable to load your progress.");
      const [analyticsPayload, goalPayload] = await Promise.all([a.json(), g.json()]);
      setAnalytics(analyticsPayload);
      if (goalPayload.goal) {
        const next = { dailyTargetMinutes: goalPayload.goal.dailyTargetMinutes, weeklyTargetMinutes: goalPayload.goal.weeklyTargetMinutes };
        setGoal(next);
        setSavedGoal(next);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load your progress.");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAnalytics();
  }, [loadAnalytics]);

  const refreshTracker = tracker.refresh;
  useEffect(() => {
    const update = () => {
      void loadAnalytics();
      void refreshTracker();
    };
    window.addEventListener("zohra:study-updated", update);
    return () => window.removeEventListener("zohra:study-updated", update);
  }, [loadAnalytics, refreshTracker]);

  const running = tracker.active ? tracker.elapsedSeconds : 0;
  const todaySeconds = analytics?.todaySeconds ?? 0;
  const weekSeconds = (analytics?.weekSeconds ?? 0) + running;
  const goalChanged =
    goal.dailyTargetMinutes !== savedGoal.dailyTargetMinutes || goal.weeklyTargetMinutes !== savedGoal.weeklyTargetMinutes;
  const streak = calendar.streak;

  async function saveGoals() {
    setGoalSaving(true);
    try {
      const response = await fetch("/api/study-goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save goals.");
      setSavedGoal(goal);
      toast.success("Goals updated.");
      void loadAnalytics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save goals.");
    } finally {
      setGoalSaving(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Timer }[] = [
    { id: "focus", label: "Focus", icon: Timer },
    { id: "insights", label: "Insights", icon: BarChart3 },
  ];

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1100px] space-y-4 pb-8 sm:space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Study</h1>
          <p className="mt-1 text-sm text-muted-foreground">Time your focus, then watch it add up.</p>
        </div>
        <div role="tablist" aria-label="Study sections" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1 sm:w-64">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`study-tab-${id}`}
              role="tab"
              type="button"
              aria-selected={tab === id}
              aria-controls="study-panel"
              onClick={() => setTab(id)}
              className={cn(
                "flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold motion-safe:transition-colors",
                tab === id ? "bg-violet-600 text-violet-50 shadow-sm" : "text-muted-foreground hover:text-foreground",
                focusRing,
              )}
            >
              <Icon size={16} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </header>

      <div id="study-panel" role="tabpanel" aria-labelledby={`study-tab-${tab}`}>
        {tab === "focus" ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <FocusTimer todaySeconds={todaySeconds} goalSeconds={goal.dailyTargetMinutes * 60} initialTaskId={initialTaskId} />

            <div className="min-w-0 space-y-4 sm:space-y-5">
              <section aria-labelledby="streak-heading" className={cn(panel, "p-4 sm:p-5")}>
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-14 shrink-0 place-items-center rounded-2xl",
                      streak?.current ? "bg-orange-500/15 text-orange-600 dark:text-orange-300" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Flame size={26} />
                  </span>
                  <div className="min-w-0">
                    <h2 id="streak-heading" className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                      {streak ? `${streak.current}-day streak` : "Streak"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {!streak
                        ? "Loading…"
                        : streak.current
                          ? `Best so far: ${streak.best} day${streak.best === 1 ? "" : "s"}`
                          : "Study or finish a task today to start one"}
                    </p>
                  </div>
                </div>
              </section>

              <section aria-labelledby="goals-progress" className={cn(panel, "space-y-4 p-4 sm:p-5")}>
                <h2 id="goals-progress" className="text-base font-semibold tracking-tight text-foreground">
                  Your goals
                </h2>
                <Meter label="Today" value={todaySeconds + running} goal={goal.dailyTargetMinutes * 60} tone="bg-violet-600 dark:bg-violet-400" />
                <Meter label="This week" value={weekSeconds} goal={goal.weeklyTargetMinutes * 60} tone="bg-emerald-600 dark:bg-emerald-400" />

                <details className="group border-t border-border pt-3">
                  <summary className={cn("flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg text-sm font-medium text-foreground", focusRing)}>
                    Adjust goals
                    <span aria-hidden="true" className="text-muted-foreground motion-safe:transition-transform group-open:rotate-45">
                      <Plus size={16} />
                    </span>
                  </summary>
                  <div className="mt-3 space-y-4">
                    <Stepper label="Daily goal" value={goal.dailyTargetMinutes} step={15} min={15} max={1440} onChange={(v) => setGoal((g) => ({ ...g, dailyTargetMinutes: v }))} />
                    <Stepper label="Weekly goal" value={goal.weeklyTargetMinutes} step={30} min={60} max={10080} onChange={(v) => setGoal((g) => ({ ...g, weeklyTargetMinutes: v }))} />
                    <button
                      type="button"
                      onClick={() => void saveGoals()}
                      disabled={!goalChanged || goalSaving}
                      className={cn(secondaryButton, "w-full disabled:opacity-50")}
                    >
                      <Save size={15} aria-hidden="true" /> {goalSaving ? "Saving…" : goalChanged ? "Save goals" : "Saved"}
                    </button>
                  </div>
                </details>
              </section>

              <section aria-labelledby="recent-heading" className={cn(panel, "p-4 sm:p-5")}>
                <div className="flex items-center justify-between gap-3">
                  <h2 id="recent-heading" className="text-base font-semibold tracking-tight text-foreground">
                    Recent sessions
                  </h2>
                  <button type="button" onClick={() => setTab("insights")} className={cn("min-h-10 rounded-lg px-2 text-sm font-medium text-violet-700 hover:underline dark:text-violet-300", focusRing)}>
                    See insights
                  </button>
                </div>
                {tracker.sessions.length ? (
                  <ul className="mt-2 divide-y divide-border">
                    {tracker.sessions.slice(0, 5).map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.subject?.name || "Independent study"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.topic || item.task?.title || (item.endedAt ? new Date(item.endedAt).toLocaleDateString() : "Completed")}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
                          {duration(item.durationSeconds ?? item.accumulatedSeconds)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">Finished sessions will show up here.</p>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:items-start">
            <div className="lg:sticky lg:top-4">
              <MonthHeatmap
                month={month}
                onMonth={setMonth}
                data={calendar.data}
                loading={calendar.loading}
                error={calendar.error}
                onRetry={calendar.retry}
              />
            </div>
            <InsightsView analytics={analytics} days={days} onDays={setDays} loading={analyticsLoading} />
          </div>
        )}
      </div>
    </div>
  );
}

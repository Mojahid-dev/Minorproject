"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Flame, Pause, Play, Save, Target, Timer, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useStudyTracker } from "@/components/study-progress/study-tracker-provider";

type Analytics = {
  range: number; todaySeconds: number; totalSeconds: number; previousSeconds: number;
  tasksCompleted: number; sessionCount: number; activeDays: number; averageSessionSeconds: number;
  weekSeconds: number; dailyGoalSeconds: number; weeklyGoalSeconds: number;
  daily: { date: string; seconds: number; completedTasks: number }[];
};
type Goal = { dailyTargetMinutes: number; weeklyTargetMinutes: number };

function duration(seconds: number) {
  const hours = Math.floor(Math.max(0, seconds) / 3600);
  const minutes = Math.floor((Math.max(0, seconds) % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
function clock(seconds: number) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export default function StudyProgressPage() {
  const [tab, setTab] = useState<"focus" | "analytics">("focus");
  const tracker = useStudyTracker();
  const [subjectId, setSubjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [topic, setTopic] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [days, setDays] = useState(7);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [goal, setGoal] = useState<Goal>({ dailyTargetMinutes: 120, weeklyTargetMinutes: 600 });
  const [goalSaving, setGoalSaving] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "analytics") setTab("analytics");
    const requestedTask = params.get("taskId");
    if (requestedTask) setTaskId(requestedTask);
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const [analyticsResponse, goalResponse] = await Promise.all([
        fetch(`/api/study-analytics?days=${days}&timeZone=${encodeURIComponent(timeZone)}`, { cache: "no-store" }),
        fetch("/api/study-goals", { cache: "no-store" }),
      ]);
      if (!analyticsResponse.ok || !goalResponse.ok) throw new Error("Unable to load your progress.");
      const [analyticsPayload, goalPayload] = await Promise.all([analyticsResponse.json(), goalResponse.json()]);
      setAnalytics(analyticsPayload);
      if (goalPayload.goal) setGoal({ dailyTargetMinutes: goalPayload.goal.dailyTargetMinutes, weeklyTargetMinutes: goalPayload.goal.weeklyTargetMinutes });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load analytics.");
    } finally { setAnalyticsLoading(false); }
  }, [days]);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);
  useEffect(() => {
    const update = () => { void loadAnalytics(); void tracker.refresh(); };
    window.addEventListener("zohra:study-updated", update);
    return () => window.removeEventListener("zohra:study-updated", update);
  }, [loadAnalytics, tracker.refresh]);

  const active = tracker.active;
  const todayWithActive = (analytics?.todaySeconds ?? 0) + (active ? tracker.elapsedSeconds : 0);
  const weekWithActive = (analytics?.weekSeconds ?? 0) + (active ? tracker.elapsedSeconds : 0);
  const dailyProgress = analytics ? Math.min(100, Math.round((todayWithActive / Math.max(1, goal.dailyTargetMinutes * 60)) * 100)) : 0;
  const weeklyProgress = analytics ? Math.min(100, Math.round((weekWithActive / Math.max(1, goal.weeklyTargetMinutes * 60)) * 100)) : 0;
  // Up to 30 days: one bar per day. 90 days: one bar per Monday-start week, so bars stay readable.
  const series = useMemo(() => {
    const daily = analytics?.daily ?? [];
    if (days <= 30) {
      return daily.map((item, index) => ({
        ...item,
        title: dateLabel(item.date),
        label: days <= 7 ? new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(`${item.date}T12:00:00`)) : index % 3 === 0 ? String(Number(item.date.slice(8))) : "",
      }));
    }
    const weeks = new Map<string, { date: string; seconds: number; completedTasks: number }>();
    for (const item of daily) {
      const day = new Date(`${item.date}T12:00:00`);
      day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      const week = weeks.get(key) ?? { date: key, seconds: 0, completedTasks: 0 };
      week.seconds += item.seconds;
      week.completedTasks += item.completedTasks;
      weeks.set(key, week);
    }
    return [...weeks.values()].map((item, index) => ({
      ...item,
      title: `Week of ${dateLabel(item.date)}`,
      label: index % 2 === 0 ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${item.date}T12:00:00`)) : "",
    }));
  }, [analytics, days]);
  // Calendar rows are Monday-to-Sunday weeks, so pad the first week with blanks.
  const heatCells = useMemo(() => {
    const daily = analytics?.daily ?? [];
    if (!daily.length) return [] as { date: string; seconds: number; blank?: boolean }[];
    const lead = (new Date(`${daily[0].date}T12:00:00`).getDay() + 6) % 7;
    return [
      ...Array.from({ length: lead }, (_, index) => ({ date: `blank-${index}`, seconds: 0, blank: true as const })),
      ...daily,
    ] as { date: string; seconds: number; blank?: boolean }[];
  }, [analytics]);
  const maxDay = Math.max(1, ...series.map((item) => item.seconds));
  const maxTasks = Math.max(1, ...series.map((item) => item.completedTasks));

  async function startSession() {
    const ok = await tracker.start({ mode: "STOPWATCH", subjectId: subjectId || undefined, taskId: taskId || undefined, topic: topic.trim() || undefined });
    if (ok) { setSessionNotes(""); toast.success("Study session started. Stay focused!"); }
  }
  async function finishSession() {
    const ok = await tracker.finish(sessionNotes);
    if (ok) { setSessionNotes(""); toast.success("Session saved. Nice work!"); void loadAnalytics(); }
  }
  async function saveGoals() {
    setGoalSaving(true);
    try {
      const response = await fetch("/api/study-goals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(goal) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save goals.");
      toast.success("Study goals updated.");
      void loadAnalytics();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save goals."); }
    finally { setGoalSaving(false); }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 pb-10 text-neutral-100">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Your learning journey</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Study & Progress</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">Make focused time count. See what you have accomplished and build a study rhythm that works for you.</p>
        </div>
        <div role="tablist" aria-label="Study and Progress sections" className="flex rounded-xl border border-white/10 bg-white/[.035] p-1">
          <button role="tab" aria-selected={tab === "focus"} onClick={() => setTab("focus")} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "focus" ? "bg-white text-zinc-950" : "text-neutral-400 hover:text-white"}`}><Timer size={15} className="mr-2 inline"/>Focus</button>
          <button role="tab" aria-selected={tab === "analytics"} onClick={() => setTab("analytics")} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "analytics" ? "bg-white text-zinc-950" : "text-neutral-400 hover:text-white"}`}><TrendingUp size={15} className="mr-2 inline"/>Analytics</button>
        </div>
      </header>

      {tab === "focus" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)]">
          <section className="rounded-3xl border border-white/10 bg-[#151619] p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-neutral-500">Focus workspace</p><h2 className="mt-1 text-xl font-semibold text-white">One thing at a time.</h2></div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">Your time, your pace</span>
            </div>
            <div className="mt-7 flex justify-center">
              <div className="grid size-64 place-items-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,.13),transparent_65%)] sm:size-72">
                <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-neutral-500">{active ? active.status === "PAUSED" ? "Paused" : "Focused time" : "Ready when you are"}</p><p className="mt-3 font-mono text-4xl font-semibold tracking-tight text-white tabular-nums sm:text-5xl">{clock(active ? tracker.elapsedSeconds : 0)}</p><p className="mt-3 text-xs text-neutral-500">{active?.subject?.name || (subjectId ? tracker.subjects.find((item) => item.id === subjectId)?.name : "Choose a subject below") || "Independent study"}</p></div>
              </div>
            </div>
            {!active ? (
              <div className="mx-auto mt-7 max-w-xl space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-xs font-medium text-neutral-400">Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#202125] px-3 text-sm text-white outline-none focus:border-violet-400"><option value="">Independent study</option>{tracker.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label className="space-y-2 text-xs font-medium text-neutral-400">Related task <select value={taskId} onChange={(event) => setTaskId(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#202125] px-3 text-sm text-white outline-none focus:border-violet-400"><option value="">No linked task</option>{tracker.tasks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                  <label className="space-y-2 text-xs font-medium text-neutral-400">Topic (optional)<input value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={140} placeholder="e.g. Normalization" className="h-11 w-full rounded-xl border border-white/10 bg-[#202125] px-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-violet-400"/></label>
                </div>
                <button onClick={() => void startSession()} disabled={tracker.loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-zinc-950 transition hover:bg-violet-100 disabled:opacity-50"><Play size={17} fill="currentColor"/>Start studying</button>
                <p className="text-center text-[11px] leading-5 text-neutral-500">The timer records intentional sessions only. It does not track background browsing or claim to know whether you're studying.</p>
              </div>
            ) : (
              <div className="mx-auto mt-7 max-w-xl space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.035] px-4 py-3"><div><p className="text-sm font-medium text-white">{active.topic || active.task?.title || "Study session"}</p><p className="mt-1 text-xs text-neutral-500">Manual stopwatch session</p></div><span className={`size-2 rounded-full ${active.status === "RUNNING" ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`}/></div>
                
                <div className="flex gap-2">
                  {active.status === "RUNNING" ? <button onClick={() => void tracker.pause()} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.06] text-sm font-semibold hover:bg-white/10"><Pause size={16}/>Pause</button> : <button onClick={() => void tracker.resume()} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.06] text-sm font-semibold hover:bg-white/10"><Play size={16}/>Resume</button>}
                  <button onClick={() => void finishSession()} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-zinc-950 hover:bg-neutral-200"><CheckCircle2 size={16}/>Finish session</button>
                </div>
                <label className="block space-y-2 text-xs font-medium text-neutral-400">What did you learn? (optional)<textarea value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} maxLength={1000} rows={2} placeholder="A quick note to remember what you covered…" className="w-full resize-y rounded-xl border border-white/10 bg-[#202125] p-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-violet-400"/></label>
                <button onClick={() => { if (window.confirm("Discard this unfinished session? Its time will not be saved.")) void tracker.discard(); }} className="w-full text-xs text-neutral-500 hover:text-rose-300">Discard this session</button>
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-[#151619] p-5">
              <div className="flex items-center gap-2"><Target size={17} className="text-violet-300"/><h2 className="font-semibold text-white">Today's progress</h2></div>
              <div className="mt-5 flex items-end justify-between"><p className="text-3xl font-semibold text-white">{analytics ? duration(todayWithActive) : "—"}</p><p className="text-xs text-neutral-500">of {goal.dailyTargetMinutes} min</p></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-300 transition-all" style={{ width: `${dailyProgress}%` }}/></div>
              <p className="mt-2 text-xs text-neutral-500">{dailyProgress}% of your daily study goal</p>
              <div className="mt-5 border-t border-white/[.07] pt-4"><div className="flex justify-between text-sm"><span className="text-neutral-300">This week</span><span className="font-medium text-white">{analytics ? duration(weekWithActive) : "—"}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${weeklyProgress}%` }}/></div><p className="mt-2 text-xs text-neutral-500">{weeklyProgress}% of {goal.weeklyTargetMinutes} min weekly goal</p></div>
            </section>
            <section className="rounded-3xl border border-white/10 bg-[#151619] p-5">
              <div className="flex items-center gap-2"><Clock3 size={17} className="text-violet-300"/><h2 className="font-semibold text-white">Recent sessions</h2></div>
              <div className="mt-4 space-y-3">
                {tracker.sessions.length ? tracker.sessions.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-200">{item.subject?.name || "Independent study"}</p><p className="truncate text-xs text-neutral-500">{item.topic || item.task?.title || (item.endedAt ? new Date(item.endedAt).toLocaleDateString() : "Completed")}</p></div><span className="shrink-0 text-xs font-semibold text-neutral-300">{duration(item.durationSeconds ?? item.accumulatedSeconds)}</span></div>) : <p className="py-4 text-sm text-neutral-500">Your completed sessions will appear here.</p>}
              </div>
              <button onClick={() => setTab("analytics")} className="mt-4 flex items-center gap-2 text-xs font-semibold text-violet-200 hover:text-white">View your analytics <ArrowUpRight size={14}/></button>
            </section>
          </aside>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-white">Your learning, in perspective.</h2><p className="mt-1 text-sm text-neutral-500">A picture of the time and work you have recorded in Zohra.</p></div><div className="flex rounded-xl border border-white/10 bg-white/[.035] p-1">{[7,30,90].map((value) => <button key={value} onClick={() => setDays(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${days === value ? "bg-white text-zinc-950" : "text-neutral-400 hover:text-white"}`}>{value} days</button>)}</div></div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {[{ label: "Study time", value: analytics ? duration(analytics.totalSeconds) : "—", sub: `Last ${days} days`, icon: Clock3 }, { label: "Tasks completed", value: analytics?.tasksCompleted ?? "—", sub: "In this period", icon: CheckCircle2 }, { label: "Study sessions", value: analytics?.sessionCount ?? "—", sub: "Completed sessions", icon: Timer }, { label: "Active days", value: analytics ? `${analytics.activeDays}/${days}` : "—", sub: "Days with study or task activity", icon: Flame }, { label: "Average session", value: analytics ? duration(analytics.averageSessionSeconds) : "—", sub: "Per completed session", icon: Timer }].map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-[#151619] p-5"><div className="flex items-center justify-between"><span className="text-xs font-medium text-neutral-500">{item.label}</span><item.icon size={17} className="text-violet-300"/></div><p className="mt-3 text-2xl font-semibold text-white">{analyticsLoading ? "…" : item.value}</p><p className="mt-1 text-xs text-neutral-500">{item.sub}</p></div>)}
          </div>
          <div className="grid gap-5">
            <section className="rounded-3xl border border-white/10 bg-[#151619] p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-white">Daily productivity</h3><p className="mt-1 text-xs text-neutral-500">Study time and tasks completed each day</p></div><Activity size={18} className="text-violet-300"/></div>
              <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-neutral-400"><span className="flex items-center gap-2"><i className="size-2 rounded-sm bg-violet-300"/>Study time</span><span className="flex items-center gap-2"><i className="size-2 rounded-sm bg-emerald-300"/>Tasks completed</span><span className="text-neutral-600">Each series is scaled independently.</span></div>
              <div className="mt-6 overflow-x-auto"><div className="flex h-52 min-w-[520px] items-end gap-2 sm:gap-3">{series.map((item) => { const studyHeight = item.seconds ? Math.max(4, item.seconds / maxDay * 100) : 2; const taskHeight = item.completedTasks ? Math.max(4, item.completedTasks / maxTasks * 100) : 2; return <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><div className="flex h-44 w-full max-w-12 items-end justify-center gap-1"><div title={`${item.title} · ${duration(item.seconds)} studied`} className={`w-1/2 rounded-t-md ${item.seconds ? "bg-violet-300" : "bg-white/[.06]"}`} style={{ height: `${studyHeight}%` }}/><div title={`${item.title} · ${item.completedTasks} tasks completed`} className={`w-1/2 rounded-t-md ${item.completedTasks ? "bg-emerald-300" : "bg-white/[.06]"}`} style={{ height: `${taskHeight}%` }}/></div><span className="h-3 whitespace-nowrap text-[9px] text-neutral-600">{item.label}</span></div>; })}</div></div>
              <p className="mt-3 text-xs text-neutral-500">Task counts use the date each task was marked complete. Study time uses completed sessions.</p>
            </section>

          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-[#151619] p-5 sm:p-6"><h3 className="font-semibold text-white">Study time trend</h3><p className="mt-1 text-xs text-neutral-500">Daily focused minutes</p><div className="mt-6 flex h-40 items-end gap-2">{series.map((item) => <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><div title={`${item.title} · ${duration(item.seconds)}`} className="w-full max-w-8 rounded-t-md bg-violet-300" style={{height:`${item.seconds ? Math.max(3,item.seconds/maxDay*100) : 2}%`}}/><span className="h-3 whitespace-nowrap text-[9px] text-neutral-600">{item.label}</span></div>)}</div></section>
            <section className="rounded-3xl border border-white/10 bg-[#151619] p-5 sm:p-6"><h3 className="font-semibold text-white">Task completion trend</h3><p className="mt-1 text-xs text-neutral-500">Tasks completed on each day</p><div className="mt-6 flex h-40 items-end gap-2">{series.map((item) => { return <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><div title={`${item.title} · ${item.completedTasks} tasks`} className="w-full max-w-8 rounded-t-md bg-emerald-300" style={{height:`${item.completedTasks ? Math.max(3,item.completedTasks/maxTasks*100) : 2}%`}}/><span className="h-3 whitespace-nowrap text-[9px] text-neutral-600">{item.label}</span></div>})}</div></section>
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
            <section className="rounded-3xl border border-white/10 bg-[#151619] p-5 sm:p-6"><div className="flex items-center gap-2"><CalendarDays size={17} className="text-violet-300"/><h3 className="font-semibold text-white">Activity calendar</h3></div><p className="mt-1 text-xs text-neutral-500">Daily squares shaded by recorded study time.</p><div className="mt-5 grid grid-cols-7 gap-2">{heatCells.map((item) => item.blank ? <div key={item.date} aria-hidden="true" /> : <div key={item.date} aria-label={`${dateLabel(item.date)}: ${duration(item.seconds)} studied`} title={`${dateLabel(item.date)} · ${duration(item.seconds)} studied`} className={`aspect-square rounded-md border ${item.seconds >= 7200 ? "border-emerald-300/30 bg-emerald-300/80" : item.seconds >= 3600 ? "border-emerald-300/25 bg-emerald-300/55" : item.seconds > 0 ? "border-emerald-300/20 bg-emerald-300/25" : "border-white/[.06] bg-white/[.035]"}`}/>)}</div><div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-neutral-500"><span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-white/[.08]"/>No study</span><span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-emerald-300/25"/>Under 1h</span><span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-emerald-300/55"/>1–2h</span><span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-emerald-300/80"/>2h+</span></div></section>
            <section className="rounded-3xl border border-white/10 bg-[#151619] p-5 sm:p-6"><div className="flex items-center gap-2"><Target size={17} className="text-violet-300"/><h3 className="font-semibold text-white">Your study goals</h3></div><p className="mt-1 text-xs text-neutral-500">Set targets that feel realistic and sustainable.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><label className="space-y-2 text-xs text-neutral-400">Daily target (minutes)<input type="number" min={15} max={1440} step={15} value={goal.dailyTargetMinutes} onChange={(event) => setGoal((current) => ({ ...current, dailyTargetMinutes: Number(event.target.value) }))} className="h-10 w-full rounded-xl border border-white/10 bg-[#202125] px-3 text-sm text-white outline-none focus:border-violet-400"/></label><label className="space-y-2 text-xs text-neutral-400">Weekly target (minutes)<input type="number" min={60} max={10080} step={30} value={goal.weeklyTargetMinutes} onChange={(event) => setGoal((current) => ({ ...current, weeklyTargetMinutes: Number(event.target.value) }))} className="h-10 w-full rounded-xl border border-white/10 bg-[#202125] px-3 text-sm text-white outline-none focus:border-violet-400"/></label></div><button onClick={() => void saveGoals()} disabled={goalSaving} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-semibold text-zinc-950 hover:bg-neutral-200 disabled:opacity-50"><Save size={14}/>{goalSaving ? "Saving…" : "Save goals"}</button></section>
          </div>
          <p className="text-xs leading-5 text-neutral-600">These metrics describe activity recorded in Zohra. Study time and task completion are indicators of effort and organization, not proof of subject mastery or exam performance.</p>
        </div>
      )}
    </div>
  );
}

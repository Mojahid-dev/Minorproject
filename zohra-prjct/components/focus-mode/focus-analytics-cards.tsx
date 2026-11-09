"use client";

import { useEffect, useState } from "react";
import { Activity, Clock3, Flame, Target } from "lucide-react";
import { duration } from "@/components/study-progress/format";

type Data = { totalFocusSeconds: number; totalAwaySeconds: number; totalPausedSeconds: number; completed: number; abandoned: number; averageFocusScore: number | null; goalCompletionRate: number | null; averageFocusRating: number | null; currentStreak: number; bestTimeOfDay: { hour: number; averageFocusScore: number } | null; daily: { date: string; seconds: number }[]; bySubject: { id: string; name: string; seconds: number }[] };
export function FocusAnalyticsCards() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    const load = () => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      fetch(`/api/focus/analytics?timeZone=${encodeURIComponent(timeZone)}`, { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then(setData).catch(() => setData(null));
    };
    load();
    window.addEventListener("zohra:study-updated", load);
    return () => window.removeEventListener("zohra:study-updated", load);
  }, []);
  const max = Math.max(1, ...(data?.daily.map((day) => day.seconds) ?? [1]));
  return <section className="mt-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-foreground">Focus insights</h2><p className="mt-1 text-xs text-muted-foreground">A 28-day view of your completed study sessions.</p></div><Activity size={18} className="text-violet-500"/></div>
    {!data ? <p className="mt-5 text-sm text-muted-foreground">Loading focus insights…</p> : <>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={<Clock3 size={16}/>} label="Focused time" value={duration(data.totalFocusSeconds)}/>
        <Metric icon={<Flame size={16}/>} label="Current streak" value={`${data.currentStreak} days`}/>
        <Metric icon={<Target size={16}/>} label="Focus rating" value={data.averageFocusRating ? `${data.averageFocusRating}/5 avg.` : "No ratings yet"}/>
        <Metric icon={<Activity size={16}/>} label="Sessions" value={`${data.completed} done · ${data.abandoned} ended`}/>
        <Metric icon={<Clock3 size={16}/>} label="Paused time" value={duration(data.totalPausedSeconds)}/>
        <Metric icon={<Clock3 size={16}/>} label="Away time" value={duration(data.totalAwaySeconds)}/>
        <Metric icon={<Target size={16}/>} label="Goal completion" value={data.goalCompletionRate == null ? "No check-ins" : `${data.goalCompletionRate}%`}/>
        <Metric icon={<Activity size={16}/>} label="Estimated focus" value={data.averageFocusScore == null ? "Not available" : `${data.averageFocusScore}%`}/>
      </div>
      <div className="mt-6"><p className="text-xs font-semibold text-foreground">Study activity · last 28 days</p><div className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-14">{data.daily.map((day) => <div key={day.date} title={`${day.date}: ${duration(day.seconds)}`} className="aspect-square rounded-md border border-border/40" style={{ backgroundColor: day.seconds ? `rgba(139,92,246,${0.16 + 0.78 * (day.seconds / max)})` : "var(--muted)" }} />)}</div></div>
      {data.bySubject?.length ? <div className="mt-5"><p className="text-xs font-semibold text-foreground">Focus time by subject</p><div className="mt-2 space-y-2">{data.bySubject.slice(0, 4).map((subject) => <div key={subject.id} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-muted-foreground">{subject.name}</span><span className="shrink-0 font-semibold text-foreground">{duration(subject.seconds)}</span></div>)}</div></div> : null}
      {data.bestTimeOfDay && <p className="mt-4 text-xs text-muted-foreground">Your strongest average focus window starts around <span className="font-semibold text-foreground">{String(data.bestTimeOfDay.hour).padStart(2,"0")}:00</span> ({data.bestTimeOfDay.averageFocusScore}% estimated focus score).</p>}
    </>}
  </section>;
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-border/70 bg-background p-3"><div className="flex items-center gap-2 text-violet-500">{icon}<span className="truncate text-[11px] font-medium text-muted-foreground">{label}</span></div><p className="mt-2 truncate text-sm font-semibold text-foreground">{value}</p></div>;
}

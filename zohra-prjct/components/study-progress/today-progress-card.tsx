"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Target, Timer } from "lucide-react";
import { useStudyTracker } from "@/components/study-progress/study-tracker-provider";

function format(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function TodayProgressCard() {
  const tracker = useStudyTracker();
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [goalSeconds, setGoalSeconds] = useState(7200);
  useEffect(() => {
    let alive = true;
    const load = () => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      fetch(`/api/study-analytics?days=7&timeZone=${encodeURIComponent(timeZone)}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => { if (alive && data) { setTodaySeconds(data.todaySeconds ?? 0); setGoalSeconds(data.dailyGoalSeconds ?? 7200); } })
        .catch(() => undefined);
    };
    load();
    window.addEventListener("zohra:study-updated", load);
    return () => { alive = false; window.removeEventListener("zohra:study-updated", load); };
  }, []);
  const current = todaySeconds + (tracker.active ? tracker.elapsedSeconds : 0);
  const percent = Math.min(100, Math.round(current / Math.max(1, goalSeconds) * 100));
  return (
    <section className="rounded-2xl border border-white/[.08] bg-[#151619] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-neutral-500">Study &amp; Progress</p><h2 className="mt-1 text-base font-semibold text-white">Today's progress</h2></div>
        <Link href="/study-progress" className="grid size-9 place-items-center rounded-xl border border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Open Study and Progress"><ArrowRight size={16}/></Link>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-2xl font-semibold text-white">{format(current)}</p><p className="mt-1 text-xs text-neutral-500">Focused study time today</p></div><div className="text-right"><p className="text-sm font-semibold text-neutral-200">{percent}%</p><p className="text-[10px] text-neutral-500">of daily goal</p></div></div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-300 transition-all" style={{ width: `${percent}%` }}/></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-[11px] text-neutral-500"><Target size={13}/> {Math.round(goalSeconds / 60)} min daily target</p><Link href="/study-progress" className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-200 hover:text-white"><Timer size={13}/>{tracker.active ? "Return to session" : "Start studying"}</Link></div>
    </section>
  );
}

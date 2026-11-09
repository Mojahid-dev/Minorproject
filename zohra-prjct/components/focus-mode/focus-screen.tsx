"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Check, CheckCircle2, ChevronRight, CircleStop, Maximize2, Pause, Play, Target, X } from "lucide-react";
import { toast } from "sonner";
import { useStudyTracker } from "@/components/study-progress/study-tracker-provider";
import { formatClock } from "@/lib/focus/timer";

const endReasons = [
  { value: "DONE_EARLY", label: "I finished my goal", description: "I made meaningful progress." },
  { value: "INTERRUPTED", label: "I was interrupted", description: "Something outside my plan came up." },
  { value: "GAVE_UP", label: "I stopped early", description: "I couldn't continue this session." },
] as const;

export function FocusScreen() {
  const tracker = useStudyTracker();
  const active = tracker.active;
  const [parkingText, setParkingText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [showParking, setShowParking] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [endReason, setEndReason] = useState<(typeof endReasons)[number]["value"]>("DONE_EARLY");
  const [rating, setRating] = useState(4);
  const [goalDone, setGoalDone] = useState(true);
  const [savingRating, setSavingRating] = useState(false);
  const [dismissedCompletion, setDismissedCompletion] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setNotificationPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") toast.success("Focus completion notifications enabled.");
  }

  useEffect(() => {
    if (!active && !tracker.completedSession) void tracker.refresh();
  }, [active, tracker.completedSession, tracker.refresh]);

  const remaining = tracker.remainingSeconds;
  const clock = active?.mode === "STOPWATCH" ? tracker.elapsedSeconds : remaining ?? 0;
  const progress = active?.mode === "STOPWATCH" ? 0 : active?.endsAt && active?.startedAt
    ? Math.min(100, Math.max(0, 100 - (clock / Math.max(1, active.mode === "POMODORO" ? (active.pomodoroPhase === "FOCUS" ? (active.focusDurationSeconds ?? 1500) : active.pomodoroPhase === "SHORT_BREAK" ? (active.shortBreakSeconds ?? 300) : (active.longBreakSeconds ?? 900)) : (active.plannedSeconds ?? 3000))) * 100))
    : 0;

  async function saveParkingNote(event: React.FormEvent) {
    event.preventDefault();
    if (!parkingText.trim()) return;
    setSavingNote(true);
    const ok = await tracker.addParkingNote(parkingText.trim());
    setSavingNote(false);
    if (ok) { setParkingText(""); toast.success("Saved to your Parking Lot."); }
  }

  async function endSession() {
    if (!active) return;
    const ok = await tracker.end(endReason);
    if (ok) setShowEnd(false);
  }

  async function saveCheckIn() {
    setSavingRating(true);
    const ok = await tracker.rate(rating, goalDone);
    setSavingRating(false);
    if (ok) toast.success("Your session reflection is saved.");
  }

  if (tracker.completedSession && !dismissedCompletion) {
    const session = tracker.completedSession;
    const abandoned = session.status === "ABANDONED";
    const hasRating = session.focusRating != null;
    return <main className="flex min-h-dvh items-center justify-center bg-[#0d0e12] px-4 py-10 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl sm:p-10">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-violet-500/15 text-violet-300"><CheckCircle2 size={30}/></div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[.2em] text-neutral-400">{abandoned ? "Session ended" : "Session complete"}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{abandoned ? "That's okay. Reset and try again." : "You showed up. That matters."}</h1>
        <p className="mt-3 text-sm text-neutral-400">{session.subject?.name || "Independent study"} · {session.topic || session.task?.title || "Study session"}</p>
        <p className="mt-8 font-mono text-5xl font-semibold tabular-nums">{formatClock(session.durationSeconds ?? session.focusedSeconds ?? 0)}</p>
        <p className="mt-2 text-xs text-neutral-500">Recorded focused study time</p>
        {session.goal && <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-left"><p className="text-xs text-neutral-500">YOUR INTENTION</p><p className="mt-1 text-sm">{session.goal}</p></div>}
        {session.parkingLotNotes?.length ? <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-left"><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Parking Lot · revisit later</p><ul className="mt-2 space-y-2">{session.parkingLotNotes.map((note) => <li key={note.id} className="text-sm text-neutral-300">• {note.text}</li>)}</ul></div> : null}
        {!abandoned && !hasRating ? <div className="mt-8 space-y-5 text-left">
          <div><p className="text-sm font-semibold">How focused did you feel?</p><div className="mt-3 grid grid-cols-5 gap-2">{[1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className={`h-11 rounded-xl border text-sm font-semibold ${rating === value ? "border-violet-400 bg-violet-500 text-white" : "border-white/10 bg-white/5 text-neutral-300"}`}>{value}</button>)}</div><p className="mt-2 text-xs text-neutral-500">1 = distracted · 5 = deeply focused</p></div>
          <div><p className="text-sm font-semibold">Did you complete your intention?</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setGoalDone(true)} className={`rounded-xl border p-3 text-sm ${goalDone ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-neutral-300"}`}>Yes, completed</button><button type="button" onClick={() => setGoalDone(false)} className={`rounded-xl border p-3 text-sm ${!goalDone ? "border-violet-400/60 bg-violet-400/10 text-violet-200" : "border-white/10 text-neutral-300"}`}>Not yet</button></div></div>
          <button type="button" disabled={savingRating} onClick={() => void saveCheckIn()} className="h-12 w-full rounded-xl bg-white font-semibold text-black disabled:opacity-60">{savingRating ? "Saving…" : "Save reflection"}</button>
        </div> : <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">{hasRating ? `Focus rating: ${session.focusRating}/5 · Goal ${session.goalCompleted ? "completed" : "not completed"}` : "Your session has been recorded."}</div>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row"><Link href="/study-progress" onClick={() => { tracker.clearCompleted(); setDismissedCompletion(true); }} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-white/15 text-sm font-semibold hover:bg-white/5">Back to Study</Link><Link href="/resources" onClick={() => { tracker.clearCompleted(); setDismissedCompletion(true); }} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500 text-sm font-semibold text-white hover:bg-violet-400">Open resources <ChevronRight size={16}/></Link></div>
      </section>
    </main>;
  }

  if (!active) return <main className="grid min-h-dvh place-items-center bg-[#0d0e12] px-4 text-white"><div className="max-w-md text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/10"><Target size={26}/></div><h1 className="mt-5 text-2xl font-semibold">No active focus session</h1><p className="mt-2 text-sm text-neutral-400">Start a session from your Study page and choose Focus Mode.</p><Link href="/study-progress" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black"><ArrowLeft size={16}/> Go to Study</Link></div></main>;

  const title = active.subject?.name || "Independent study";
  const isBreak = active.mode === "POMODORO" && active.pomodoroPhase !== "FOCUS";
  return <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0d0e12] text-white selection:bg-violet-500/30">
    <header className="flex items-center justify-between px-5 py-5 sm:px-9">
      <Link href="/study-progress" className="flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"><ArrowLeft size={16}/> Exit Focus Mode</Link>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5"><span className={`size-2 rounded-full ${active.status === "RUNNING" ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`}/><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-neutral-300">{active.status === "RUNNING" ? "Session running" : "Paused"}</span></div>
    </header>

    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 pb-12 pt-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[.24em] text-violet-300">{active.mode === "POMODORO" ? `Pomodoro · Cycle ${active.currentCycle ?? 1}` : active.mode === "STOPWATCH" ? "Open-ended session" : "Focus session"}</p>
      <h1 className="mt-4 max-w-full truncate text-xl font-medium text-neutral-200">{title}</h1>
      <p className="mt-1 text-sm text-neutral-500">{active.topic || active.task?.title || "Make this session count"}</p>
      {active.goal && <div className="mt-6 inline-flex max-w-xl items-start gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-left text-xs text-neutral-300"><Target size={14} className="mt-0.5 shrink-0 text-violet-300"/><span>{active.goal}</span></div>}

      <div className="relative mt-12 grid size-[min(72vw,360px)] place-items-center rounded-full border border-white/[0.07] bg-[radial-gradient(circle,rgba(139,92,246,.13),rgba(255,255,255,.015)_62%,transparent_70%)]">
        <svg viewBox="0 0 360 360" className="absolute inset-0 h-full w-full -rotate-90"><circle cx="180" cy="180" r="164" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="2"/><circle cx="180" cy="180" r="164" fill="none" stroke="#9b82f6" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${2*Math.PI*164}`} strokeDashoffset={`${2*Math.PI*164*(1-progress/100)}`} className="transition-[stroke-dashoffset] duration-500"/></svg>
        <div><p className="font-mono text-[clamp(2.8rem,11vw,5.5rem)] font-light tracking-[-.07em] tabular-nums">{formatClock(clock)}</p><p className="mt-3 text-[10px] font-semibold uppercase tracking-[.22em] text-neutral-500">{active.mode === "STOPWATCH" ? "Elapsed" : isBreak ? "Break remaining" : "Time remaining"}</p></div>
      </div>
      {isBreak && <p className="mt-5 text-sm text-emerald-300">Break time. Step away and recharge.</p>}

      <div className="mt-10 flex w-full max-w-md gap-3">
        {active.status === "RUNNING" ? <button type="button" onClick={() => void tracker.pause()} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] text-sm font-semibold transition hover:bg-white/10"><Pause size={18}/> Pause</button> : <button type="button" onClick={() => void tracker.resume()} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-500 text-sm font-semibold transition hover:bg-violet-400"><Play size={18} fill="currentColor"/> Resume</button>}
        <button type="button" onClick={() => setShowEnd(true)} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 text-sm font-semibold text-neutral-300 transition hover:border-red-400/40 hover:text-red-200"><CircleStop size={18}/> End session</button>
      </div>

      {notificationPermission === "default" && <button type="button" onClick={() => void enableNotifications()} className="mt-5 text-xs text-neutral-500 underline decoration-neutral-700 underline-offset-4 hover:text-neutral-300">Enable browser completion notifications</button>}

      <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
        <button type="button" onClick={() => setShowParking((v) => !v)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] text-xs font-semibold text-neutral-300 hover:bg-white/[0.07]"><BookOpen size={15}/> Parking Lot ({active.parkingLotNotes?.length ?? 0})</button>
        <Link href="/dashboard" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] text-xs font-semibold text-neutral-300 hover:bg-white/[0.07]"><Maximize2 size={15}/> Explore workspace</Link>
      </div>

      {showParking && <section className="mt-5 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Parking Lot</h2><p className="mt-1 text-xs text-neutral-500">Capture a thought. Come back to it after your session.</p></div><button type="button" onClick={() => setShowParking(false)} aria-label="Close Parking Lot" className="rounded-lg p-2 text-neutral-400 hover:bg-white/10"><X size={16}/></button></div>
        <form onSubmit={(event) => void saveParkingNote(event)} className="mt-4 flex gap-2"><input value={parkingText} onChange={(event) => setParkingText(event.target.value)} maxLength={500} placeholder="e.g. Check exam date…" className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-violet-400"/><button type="submit" disabled={savingNote || !parkingText.trim()} className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500 text-white disabled:opacity-40"><Check size={17}/></button></form>
        <ul className="mt-3 space-y-2">{active.parkingLotNotes?.map((note) => <li key={note.id} className="rounded-lg bg-black/20 px-3 py-2 text-sm text-neutral-300">{note.text}</li>)}</ul>
      </section>}
    </div>

    {showEnd && <div role="dialog" aria-modal="true" aria-labelledby="end-title" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#191a20] p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="end-title" className="text-lg font-semibold">End this session?</h2><p className="mt-1 text-xs text-neutral-400">Choose what best describes how it ended.</p></div><button type="button" onClick={() => setShowEnd(false)} className="rounded-lg p-2 text-neutral-400 hover:bg-white/10"><X size={17}/></button></div><div className="mt-5 space-y-2">{endReasons.map((reason) => <button key={reason.value} type="button" onClick={() => setEndReason(reason.value)} className={`w-full rounded-xl border p-3 text-left ${endReason === reason.value ? "border-violet-400 bg-violet-500/10" : "border-white/10 bg-white/[0.025]"}`}><p className="text-sm font-semibold">{reason.label}</p><p className="mt-1 text-xs text-neutral-500">{reason.description}</p></button>)}</div>{active.strictMode && <p className="mt-3 text-xs text-amber-300">Strict mode is on: an end reason is required.</p>}<div className="mt-5 flex gap-2"><button type="button" onClick={() => setShowEnd(false)} className="h-11 flex-1 rounded-xl border border-white/10 text-sm font-semibold">Keep studying</button><button type="button" onClick={() => void endSession()} className="h-11 flex-1 rounded-xl bg-white text-sm font-semibold text-black">Confirm end</button></div></div></div>}
  </main>;
}

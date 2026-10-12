"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Plus, Sparkles } from "lucide-react";
import { TaskRow } from "@/components/task-row";
import { useTasks } from "@/hooks/use-tasks";
import { formatTaskDate, localDateString, notifyTasksChanged } from "@/lib/task-utils";

function monthName(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

export default function CalendarPage() {
  const { tasks, isLoading, error, refresh } = useTasks();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(localDateString());
  const [quickTitle, setQuickTitle] = useState("");
  const [quickError, setQuickError] = useState("");
  const [saving, setSaving] = useState(false);
  const today = localDateString();


  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { date, key: localDateString(date), inMonth: date.getMonth() === month.getMonth() };
    });
  }, [month]);
  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      map.set(task.dueDate, [...(map.get(task.dueDate) ?? []), task]);
    }
    return map;
  }, [tasks]);
  const selectedTasks = tasksByDate.get(selectedDate) ?? [];
  const selectedOpen = selectedTasks.filter((task) => !task.completedAt);
  const monthKey = `${month.getFullYear()}-${`${month.getMonth() + 1}`.padStart(2, "0")}`;
  const monthTasks = tasks.filter((task) => task.dueDate?.startsWith(monthKey));
  const monthOpen = monthTasks.filter((task) => !task.completedAt).length;

  async function addForSelectedDate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickTitle.trim()) return;
    setSaving(true);
    setQuickError("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: quickTitle, dueDate: selectedDate }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to create task.");
      notifyTasksChanged();
      setQuickTitle("");
      await refresh();
    } catch (caught) {
      setQuickError(caught instanceof Error ? caught.message : "Unable to create task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] overflow-x-clip pb-10 text-white">
      <header className="relative isolate flex flex-wrap items-end justify-between gap-3 overflow-hidden rounded-2xl border border-sky-200/[0.12] bg-gradient-to-br from-[#142027] via-[#12171c] to-[#101114] p-4 sm:gap-4 sm:rounded-[28px] sm:p-7">
        <div aria-hidden="true" className="absolute -right-20 -top-36 -z-10 size-96 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.17),transparent_68%)]" />
        <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-sky-200"><Sparkles size={14} /> Your time, at a glance</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.055em] sm:text-5xl">Calendar</h1><p className="mt-2 text-sm text-neutral-300">Make a little space for what matters this month.</p></div>
        <Link href="/tasks" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/15 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10"><ArrowLeft size={16} /> All tasks</Link>
      </header>

      <div className="mt-3 grid min-w-0 grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
        <CalendarMetric icon={CalendarDays} label="Scheduled this month" value={monthTasks.length} />
        <CalendarMetric icon={Clock3} label="Still to do" value={monthOpen} />
        <CalendarMetric icon={CheckCircle2} label="Selected day" value={selectedOpen.length} suffix="open" />
      </div>

      <div className="mt-4 grid min-w-0 gap-3 sm:mt-7 sm:gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="min-w-0 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#171a1d] to-[#101114] p-3 sm:rounded-3xl sm:p-6" aria-label="Monthly task calendar">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div><div className="flex items-center gap-2 text-sm text-sky-200"><CalendarDays size={17} /> Monthly view</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">{monthName(month)}</h2></div>
            <div className="flex items-center gap-2">
              <button onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(localDateString()); }} className="min-h-10 rounded-lg border border-zinc-700 px-2.5 py-2 text-xs font-medium text-neutral-200 hover:bg-white/10 sm:px-3">Today</button>
              <button aria-label="Previous month" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} className="grid size-10 place-items-center rounded-lg border border-zinc-700 text-neutral-300 hover:bg-white/10"><ChevronLeft size={18} /></button>
              <button aria-label="Next month" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} className="grid size-10 place-items-center rounded-lg border border-zinc-700 text-neutral-300 hover:bg-white/10"><ChevronRight size={18} /></button>
            </div>
          </div>
          {isLoading ? <p className="py-16 text-center text-sm text-neutral-500">Loading your calendar…</p>
            : error ? <div className="py-16 text-center"><p role="alert" className="text-sm text-red-300">{error}</p><button onClick={() => void refresh()} className="mt-3 rounded-lg bg-white/[0.08] px-3 py-2 text-sm">Try again</button></div>
              : <div className="mt-6">
                <div className="grid grid-cols-7 border-b border-zinc-800 pb-2 text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-neutral-500 sm:text-[11px] sm:tracking-[0.12em]">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day}>{day}</div>)}</div>
                <div className="mt-1 grid min-w-0 grid-cols-7 gap-[2px] sm:gap-1">
                  {days.map(({ date, key, inMonth }) => {
                    const dayTasks = tasksByDate.get(key) ?? [];
                    const openCount = dayTasks.filter((task) => !task.completedAt).length;
                    const isSelected = key === selectedDate;
                    const isToday = key === today;
                    return <button key={key} onClick={() => { setSelectedDate(key); if (!inMonth) setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }} aria-label={`${formatTaskDate(key)}${dayTasks.length ? `, ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}` : ""}`} aria-pressed={isSelected} className={`relative flex min-h-[46px] min-w-0 flex-col items-center justify-start gap-0.5 rounded-md py-1 text-[11px] transition sm:min-h-[86px] sm:gap-1 sm:rounded-xl sm:py-2 sm:text-sm ${inMonth ? "text-neutral-200" : "text-neutral-700"} ${isSelected ? "bg-sky-200/[0.12] ring-1 ring-sky-100/25" : "hover:bg-white/[0.05]"}`}>
                      <span className={`grid size-6 place-items-center rounded-full sm:size-7 ${isToday ? "bg-sky-100 font-semibold text-zinc-950 shadow-[0_0_20px_rgba(186,230,253,0.22)]" : isSelected ? "text-sky-100" : ""}`}>{date.getDate()}</span>
                      {dayTasks.length > 0 && <span className="flex h-2 items-center gap-0.5" aria-hidden="true">{dayTasks.slice(0, 3).map((task) => <i key={task.id} className={`size-1 rounded-full ${task.completedAt ? "bg-emerald-300/70" : "bg-sky-200"}`} />)}{dayTasks.length > 3 && <b className="ml-0.5 text-[8px] font-medium text-neutral-400">+{dayTasks.length - 3}</b>}</span>}
                      {dayTasks.length > 0 && <span className="hidden max-w-full truncate px-1 text-[9px] text-neutral-500 sm:block">{openCount ? `${openCount} open` : "Done"}</span>}
                    </button>;
                  })}
                </div>
              </div>}
          <p className="mt-4 text-xs text-neutral-500">Dates are shown in your local calendar day.</p>
        </section>

        <aside className="relative isolate min-w-0 overflow-hidden rounded-2xl border border-sky-200/[0.1] bg-gradient-to-br from-[#172027] to-[#111418] p-4 sm:rounded-3xl sm:p-5">
          <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 size-56 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.14),transparent_70%)]" />
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Your agenda</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{formatTaskDate(selectedDate)}</h2><p className="mt-1 text-xs text-neutral-400">{selectedOpen.length} open <span className="px-1 text-neutral-600">·</span> {selectedTasks.length} total</p></div><span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-sky-100"><CalendarDays size={18} /></span></div>
          <form onSubmit={addForSelectedDate} className="mt-5 flex gap-2"><label className="sr-only" htmlFor="calendar-quick-add">Add task for selected day</label><input id="calendar-quick-add" value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} maxLength={180} placeholder="Add a task for this day" className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm outline-none placeholder:text-neutral-600 focus:border-neutral-400"/><button aria-label="Add task" disabled={saving || !quickTitle.trim()} className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-black transition hover:bg-neutral-200 disabled:opacity-50">{saving ? <span className="text-xs">…</span> : <Plus size={18} />}</button></form>
          {quickError && <p role="alert" className="mt-2 text-xs text-red-300">{quickError}</p>}
          <div className="mt-4 space-y-2">
            {selectedTasks.length ? selectedTasks.map((task) => <div key={task.id} className="space-y-2"><TaskRow task={task} compact onChanged={() => void refresh()} /><Link href={`/tasks?date=${selectedDate}`} className="ml-8 inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-white">Open in Tasks <ArrowRight size={12} /></Link></div>) : <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center"><p className="text-sm text-neutral-400">No tasks on this day.</p><p className="mt-1 text-xs text-neutral-600">Add one above or choose another date.</p></div>}
          </div>
          <Link href={`/tasks?date=${selectedDate}`} className="mt-5 flex items-center justify-between rounded-xl bg-white/[0.06] px-3.5 py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/[0.1]">See tasks for this day <ArrowRight size={16} /></Link>
        </aside>
      </div>
    </div>
  );
}

function CalendarMetric({ icon: Icon, label, value, suffix }: { icon: typeof CalendarDays; label: string; value: number; suffix?: string }) {
  return <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#15181b] p-2.5 sm:flex sm:items-center sm:gap-3 sm:p-4"><span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-sky-200/[0.09] text-sky-100 sm:grid"><Icon size={18} /></span><div className="min-w-0"><p className="min-h-7 text-[10px] leading-3 text-neutral-400 sm:min-h-0 sm:text-xs sm:leading-normal">{label}</p><p className="mt-0.5 text-xl font-semibold text-white sm:text-xl">{value}{suffix && <span className="ml-1.5 text-[10px] font-normal text-neutral-500 sm:text-xs">{suffix}</span>}</p></div></div>;
}

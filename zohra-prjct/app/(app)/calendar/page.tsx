"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
    <div className="mx-auto max-w-[1440px] pb-10 text-white">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-medium text-neutral-400">Your planner</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Calendar</h1><p className="mt-2 text-sm text-neutral-400">See what’s due and plan your study days.</p></div>
        <Link href="/tasks" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10"><ArrowLeft size={16} /> Tasks</Link>
      </header>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#151619] to-[#101114] p-4 sm:p-6" aria-label="Monthly task calendar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="flex items-center gap-2 text-sm text-neutral-400"><CalendarDays size={17} /> Monthly view</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">{monthName(month)}</h2></div>
            <div className="flex items-center gap-2">
              <button onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(localDateString()); }} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-white/10">Today</button>
              <button aria-label="Previous month" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} className="grid size-9 place-items-center rounded-lg border border-zinc-700 text-neutral-300 hover:bg-white/10"><ChevronLeft size={18} /></button>
              <button aria-label="Next month" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} className="grid size-9 place-items-center rounded-lg border border-zinc-700 text-neutral-300 hover:bg-white/10"><ChevronRight size={18} /></button>
            </div>
          </div>
          {isLoading ? <p className="py-16 text-center text-sm text-neutral-500">Loading your calendar…</p>
            : error ? <div className="py-16 text-center"><p role="alert" className="text-sm text-red-300">{error}</p><button onClick={() => void refresh()} className="mt-3 rounded-lg bg-white/[0.08] px-3 py-2 text-sm">Try again</button></div>
              : <div className="mt-6">
                <div className="grid grid-cols-7 border-b border-zinc-800 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day}>{day}</div>)}</div>
                <div className="grid grid-cols-7">
                  {days.map(({ date, key, inMonth }) => {
                    const dayTasks = tasksByDate.get(key) ?? [];
                    const isSelected = key === selectedDate;
                    const isToday = key === today;
                    return <button key={key} onClick={() => setSelectedDate(key)} aria-label={`${formatTaskDate(key)}${dayTasks.length ? `, ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}` : ""}`} aria-pressed={isSelected} className={`relative flex min-h-[62px] flex-col items-center gap-1 border-b border-zinc-800/70 py-2 text-sm transition sm:min-h-[86px] ${inMonth ? "text-neutral-200" : "text-neutral-700"} ${isSelected ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"}`}>
                      <span className={`grid size-7 place-items-center rounded-full ${isToday ? "bg-white font-semibold text-black" : isSelected ? "ring-1 ring-white/50" : ""}`}>{date.getDate()}</span>
                      {dayTasks.length > 0 && <span className="max-w-full truncate px-1 text-[9px] text-neutral-400 sm:text-[10px]">{dayTasks.length} task{dayTasks.length === 1 ? "" : "s"}</span>}
                    </button>;
                  })}
                </div>
              </div>}
          <p className="mt-4 text-xs text-neutral-500">Dates are shown in your local calendar day.</p>
        </section>

        <aside className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#151619] to-[#101114] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-neutral-400">Selected day</p><h2 className="mt-1 text-xl font-semibold">{formatTaskDate(selectedDate)}</h2><p className="mt-1 text-xs text-neutral-500">{selectedOpen.length} open · {selectedTasks.length} total</p></div><span className="grid size-9 place-items-center rounded-lg bg-white/[0.07] text-neutral-200"><CalendarDays size={17} /></span></div>
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

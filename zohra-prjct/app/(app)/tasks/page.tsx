"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ListTodo, Plus } from "lucide-react";
import { TaskRow } from "@/components/task-row";
import { useTasks } from "@/hooks/use-tasks";
import { formatTaskDate, localDateString, notifyTasksChanged } from "@/lib/task-utils";

type TaskView = "today" | "upcoming" | "unscheduled" | "completed" | "date";

function requestedDate() {
  if (typeof window === "undefined") return "";
  const value = new URLSearchParams(window.location.search).get("date") ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export default function TasksPage() {
  const { tasks, isLoading, error, refresh } = useTasks();
  const [selectedDate, setSelectedDate] = useState(() => requestedDate() || localDateString());
  const [view, setView] = useState<TaskView>(() => requestedDate() && requestedDate() !== localDateString() ? "date" : "today");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(() => requestedDate());
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const today = localDateString();

  const openTasks = useMemo(() => tasks.filter((task) => !task.completedAt), [tasks]);
  const dueToday = openTasks.filter((task) => task.dueDate === today);
  const overdue = openTasks.filter((task) => task.dueDate && task.dueDate < today);
  const upcoming = openTasks.filter((task) => task.dueDate && task.dueDate > today);
  const unscheduled = openTasks.filter((task) => !task.dueDate);
  const completed = tasks.filter((task) => Boolean(task.completedAt));

  const tabs: { id: TaskView; label: string; count: number }[] = [
    { id: "today", label: "Today", count: dueToday.length },
    { id: "upcoming", label: "Upcoming", count: overdue.length + upcoming.length },
    { id: "unscheduled", label: "Unscheduled", count: unscheduled.length },
    { id: "completed", label: "Completed", count: completed.length },
  ];

  let visibleTasks = view === "today" ? dueToday
    : view === "upcoming" ? [...overdue, ...upcoming]
      : view === "unscheduled" ? unscheduled
        : view === "completed" ? completed
          : tasks.filter((task) => task.dueDate === selectedDate);
  if (view === "upcoming") visibleTasks = [...visibleTasks].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    setFormError("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes: notes || null, dueDate: dueDate || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to create task.");
      notifyTasksChanged();
      setTitle("");
      setNotes("");
      setDueDate("");
      await refresh();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Unable to create task.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] pb-10 text-white">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-400">Your planner</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Tasks</h1>
          <p className="mt-2 text-sm text-neutral-400">Keep today’s priorities and upcoming work in one place.</p>
        </div>
        <Link href="/calendar" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10"><CalendarDays size={17} /> Open calendar</Link>
      </header>

      <form onSubmit={createTask} className="mt-7 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#191a1d] to-[#111214] p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-200"><Plus size={17} /> Quick add a task</div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_auto]">
          <label className="sr-only" htmlFor="new-task-title">Task title</label>
          <input id="new-task-title" required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What do you need to do?" className="h-11 min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-neutral-400" />
          <label className="sr-only" htmlFor="new-task-date">Due date</label>
          <input id="new-task-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-neutral-200 outline-none focus:border-neutral-400" />
          <button disabled={isSaving || !title.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? "Adding…" : "Add task"}<ArrowRight size={16} /></button>
        </div>
        <label className="mt-3 block text-xs text-neutral-500">Notes (optional)
          <textarea maxLength={5000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a little context" className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-zinc-600" />
        </label>
        {formError && <p role="alert" className="mt-2 text-sm text-red-300">{formError}</p>}
      </form>

      <section className="mt-7 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#151619] to-[#101114] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="flex items-center gap-2 text-sm text-neutral-400"><ListTodo size={17} /> {view === "date" ? "Selected day" : "Personal tasks"}</div><h2 className="mt-1.5 text-xl font-semibold">{view === "date" ? formatTaskDate(selectedDate) : "Your tasks"}</h2></div>
          {view === "date" && <button onClick={() => { setView("today"); setSelectedDate(today); }} className="rounded-lg px-3 py-2 text-xs text-neutral-300 hover:bg-white/10">Back to today</button>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-b border-zinc-800 pb-4">
          {tabs.map((tab) => <button key={tab.id} onClick={() => setView(tab.id)} aria-pressed={view === tab.id} className={`rounded-lg px-3 py-2 text-sm transition ${view === tab.id ? "bg-white text-black" : "text-neutral-400 hover:bg-white/10 hover:text-white"}`}>{tab.label}<span className={`ml-2 rounded-md px-1.5 py-0.5 text-xs ${view === tab.id ? "bg-black/10" : "bg-white/[0.07]"}`}>{tab.count}</span></button>)}
        </div>
        {isLoading ? <p className="py-8 text-center text-sm text-neutral-500">Loading your tasks…</p>
          : error ? <div className="py-8 text-center"><p role="alert" className="text-sm text-red-300">{error}</p><button onClick={() => void refresh()} className="mt-3 rounded-lg bg-white/[0.08] px-3 py-2 text-sm">Try again</button></div>
            : view === "upcoming" && visibleTasks.length === 0 ? <EmptyTasks message="No overdue or upcoming tasks. You’re all caught up." />
              : visibleTasks.length === 0 ? <EmptyTasks message={view === "completed" ? "Completed tasks will appear here." : view === "unscheduled" ? "Tasks without due dates will appear here." : view === "date" ? "No tasks are scheduled for this date." : "Nothing due today. Add a task above or enjoy the breathing room."} />
                : <div className="mt-4 space-y-2">{view === "upcoming" && overdue.length > 0 && <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-rose-300">Overdue</p>}{visibleTasks.map((task) => <TaskRow key={task.id} task={task} onChanged={() => void refresh()} />)}</div>}
      </section>
      <div className="mt-4 flex items-center justify-between gap-4 text-xs text-neutral-500"><span>{openTasks.length} active task{openTasks.length === 1 ? "" : "s"}</span><span>Due dates use your local calendar day.</span></div>
    </div>
  );
}

function EmptyTasks({ message }: { message: string }) {
  return <div className="grid min-h-40 place-items-center px-4 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-white/[0.06] text-neutral-400"><ListTodo size={20} /></span><p className="mt-3 text-sm text-neutral-400">{message}</p></div></div>;
}

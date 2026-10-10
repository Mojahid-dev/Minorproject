"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, Circle, Plus, Trash2 } from "lucide-react";

type Task = { id: string; title: string; description: string | null; status: "TODO" | "IN_PROGRESS" | "DONE"; priority: "LOW" | "NORMAL" | "HIGH"; dueDate: string | null; createdAt: string };
type Filter = "all" | "today" | "upcoming" | "overdue" | "completed";
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All tasks" }, { id: "today", label: "Today" }, { id: "upcoming", label: "Upcoming" }, { id: "overdue", label: "Overdue" }, { id: "completed", label: "Completed" },
];

function localDate(date: string | null) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function localDay() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dueLabel(task: Task) {
  if (!task.dueDate) return "No due date";
  if (task.status === "DONE") return localDate(task.dueDate);
  const due = new Date(task.dueDate).toISOString().slice(0, 10);
  const today = localDay();
  if (due < today) return `Overdue · ${localDate(task.dueDate)}`;
  if (due === today) return "Due today";
  return localDate(task.dueDate);
}

export default function TasksPage() {
  const searchParams = useSearchParams();
  const requestedFilter = searchParams.get("filter") as Filter | null;
  const filter: Filter = filters.some((item) => item.id === requestedFilter) ? requestedFilter! : "all";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("NORMAL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "", dueDate: "", priority: "NORMAL" as Task["priority"] });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks?filter=${filter}&date=${localDay()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load tasks.");
      setTasks(payload.tasks);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load tasks.");
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, dueDate: dueDate || null, priority }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create task.");
      setTitle(""); setDescription(""); setDueDate(""); setPriority("NORMAL");
      await loadTasks();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create task."); }
    finally { setSaving(false); }
  }

  async function updateTask(task: Task, data: Partial<Task>) {
    const response = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error || "Could not update task."); return; }
    await loadTasks(); setEditing(null);
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error || "Could not delete task."); return; }
    setTasks((current) => current.filter((item) => item.id !== task.id));
  }

  function startEditing(task: Task) {
    setEditing(task.id);
    setDraft({ title: task.title, description: task.description ?? "", dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "", priority: task.priority });
  }

  return <div className="mx-auto max-w-5xl pb-10 text-white">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm text-neutral-400">Personal workspace</p><h1 className="mt-1 text-4xl font-semibold tracking-tight">Tasks</h1><p className="mt-2 text-sm text-neutral-400">Keep track of what you need to do next.</p></div>
      <Link href="/upload" className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-neutral-200 hover:bg-white/5">Add a resource</Link>
    </header>

    <form onSubmit={createTask} className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
      <label className="block text-sm font-medium text-neutral-200" htmlFor="task-title">New task</label>
      <div className="mt-2 flex gap-2"><input id="task-title" maxLength={160} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to get done?" className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm outline-none focus:border-zinc-400" /><button disabled={saving} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black disabled:opacity-50"><Plus size={16} /> Add task</button></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px_160px]"><input maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Notes (optional)" className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm outline-none focus:border-zinc-500" /><label className="sr-only" htmlFor="task-due-date">Due date</label><input id="task-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-neutral-300 outline-none focus:border-zinc-500" /><label className="sr-only" htmlFor="task-priority">Priority</label><select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as Task["priority"])} className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-neutral-300 outline-none"><option value="LOW">Low priority</option><option value="NORMAL">Normal priority</option><option value="HIGH">High priority</option></select></div>
    </form>

    <nav aria-label="Task filters" className="mt-6 flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <Link key={item.id} href={item.id === "all" ? "/tasks" : `/tasks?filter=${item.id}`} aria-current={item.id === filter ? "page" : undefined} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium ${item.id === filter ? "bg-white text-black" : "border border-zinc-800 text-neutral-400 hover:text-white"}`}>{item.label}</Link>)}</nav>

    {error && <p role="alert" className="mt-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>}
    <section className="mt-4 divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/35">
      {loading ? <p className="p-6 text-sm text-neutral-500">Loading tasks…</p> : tasks.length ? tasks.map((task) => <article key={task.id} className="flex items-start gap-3 p-4 sm:p-5">
        <button onClick={() => void updateTask(task, { status: task.status === "DONE" ? "TODO" : "DONE" })} aria-label={task.status === "DONE" ? `Reopen ${task.title}` : `Complete ${task.title}`} className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${task.status === "DONE" ? "border-emerald-400 bg-emerald-400 text-black" : "border-zinc-600 text-transparent hover:border-white"}`}>{task.status === "DONE" ? <Check size={15} /> : <Circle size={14} />}</button>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`text-sm font-medium ${task.status === "DONE" ? "text-neutral-500 line-through" : "text-neutral-100"}`}>{task.title}</span><button onClick={() => startEditing(task)} className="text-xs text-neutral-500 underline underline-offset-2 hover:text-white">Edit</button><select aria-label={`Change status for ${task.title}`} value={task.status} onChange={(event) => void updateTask(task, { status: event.target.value as Task["status"] })} className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-neutral-400"><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option></select></div>
          {task.description && <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-500">{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500"><span className={task.status !== "DONE" && task.dueDate && new Date(task.dueDate).toISOString().slice(0, 10) < localDay() ? "text-amber-300" : ""}>{dueLabel(task)}</span><span aria-hidden="true">·</span><span className={task.priority === "HIGH" ? "text-amber-300" : ""}>{task.priority.toLowerCase()} priority</span></div>
          {editing === task.id && <form onSubmit={(event) => { event.preventDefault(); void updateTask(task, { title: draft.title, description: draft.description || null, dueDate: draft.dueDate ? new Date(`${draft.dueDate}T12:00:00`).toISOString() : null, priority: draft.priority }); }} className="mt-3 grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 sm:grid-cols-2"><input required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} aria-label="Task title" className="h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-sm" /><textarea maxLength={5000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} aria-label="Task notes" placeholder="Notes (optional)" className="min-h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm sm:row-span-2" /><input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} aria-label="Due date" className="h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-sm text-neutral-300" /><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Task["priority"] })} aria-label="Priority" className="h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-sm text-neutral-300"><option value="LOW">Low priority</option><option value="NORMAL">Normal priority</option><option value="HIGH">High priority</option></select><div className="flex gap-2 sm:col-span-2"><button className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black">Save changes</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-neutral-300">Cancel</button></div></form>}
        </div>
        <button onClick={() => void deleteTask(task)} aria-label={`Delete ${task.title}`} className="grid size-9 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 size={16} /></button>
      </article>) : <div className="p-8 text-center"><p className="font-medium text-neutral-200">{filter === "completed" ? "No completed tasks yet" : "No tasks here"}</p><p className="mt-1 text-sm text-neutral-500">Add a task above and it will show up here.</p></div>}
    </section>
  </div>;
}

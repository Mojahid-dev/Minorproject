"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { TaskRecord } from "@/lib/task-utils";
import { formatTaskDate, localDateString, notifyTasksChanged } from "@/lib/task-utils";

export function TaskRow({ task, onChanged, compact = false }: {
  task: TaskRecord;
  onChanged: () => void;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const completed = Boolean(task.completedAt);
  const overdue = Boolean(task.dueDate && task.dueDate < localDateString() && !completed);

  async function update(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update task.");
      notifyTasksChanged();
      onChanged();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update task.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to delete task.");
      notifyTasksChanged();
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete task.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (await update({ title, notes: notes || null, dueDate: dueDate || null })) setEditing(false);
      }} className="rounded-xl border border-zinc-700 bg-zinc-950/70 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <label className="text-xs text-neutral-400">Task title
            <input autoFocus maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-neutral-400" />
          </label>
          <label className="text-xs text-neutral-400">Due date
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-neutral-400" />
          </label>
        </div>
        <label className="mt-3 block text-xs text-neutral-400">Notes
          <textarea maxLength={5000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-400" />
        </label>
        {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => { setEditing(false); setError(""); }} className="rounded-lg px-3 py-2 text-xs text-neutral-300 hover:bg-white/10"><X size={14} className="mr-1 inline" />Cancel</button>
          <button disabled={busy || !title.trim()} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50">{busy ? "Saving…" : "Save task"}</button>
        </div>
      </form>
    );
  }

  return (
    <article className={`group rounded-xl border border-white/[0.06] bg-zinc-950/45 p-3 transition hover:border-white/10 ${compact ? "" : "sm:p-4"}`}>
      <div className="flex items-start gap-3">
        <button type="button" disabled={busy} onClick={() => void update({ completed: !completed })} aria-label={`${completed ? "Reopen" : "Complete"} ${task.title}`} aria-pressed={completed} className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition ${completed ? "border-white bg-white text-zinc-900" : "border-zinc-600 text-transparent hover:border-white"}`}><Check size={13} /></button>
        <div className="min-w-0 flex-1">
          <p className={`break-words text-sm font-medium ${completed ? "text-neutral-500 line-through" : "text-neutral-100"}`}>{task.title}</p>
          {task.notes && !compact && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-neutral-400">{task.notes}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {task.dueDate ? <span className={overdue ? "text-rose-300" : "text-neutral-500"}>{overdue ? "Overdue · " : "Due "}{formatTaskDate(task.dueDate)}</span> : <span className="text-neutral-600">No due date</span>}
            {completed && <span className="text-emerald-300">Completed</span>}
          </div>
          {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
        {!compact && <div className="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-60 sm:group-hover:opacity-100">
          <button type="button" disabled={busy} onClick={() => setEditing(true)} aria-label={`Edit ${task.title}`} className="grid size-8 place-items-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white disabled:opacity-50"><Pencil size={15} /></button>
          <button type="button" disabled={busy} onClick={() => void remove()} aria-label={`Delete ${task.title}`} className="grid size-8 place-items-center rounded-lg text-neutral-400 hover:bg-red-950 hover:text-red-200 disabled:opacity-50"><Trash2 size={15} /></button>
        </div>}
      </div>
    </article>
  );
}

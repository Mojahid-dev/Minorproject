"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Plus, Search, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { focusRing } from "@/components/dashboard/shared";
import { useTasks } from "@/hooks/use-tasks";
import { localDateString, notifyTasksChanged, type TaskRecord } from "@/lib/task-utils";
import { addDays } from "@/lib/dashboard-utils";
import { duration } from "./format";

const COLLAPSED_COUNT = 4;

function dueChip(task: TaskRecord, today: string) {
  if (!task.dueDate) return null;
  if (task.dueDate < today) return { label: "Overdue", tone: "bg-red-500/15 text-red-700 dark:text-red-300" };
  if (task.dueDate === today) return { label: "Today", tone: "bg-amber-500/15 text-amber-800 dark:text-amber-300" };
  if (task.dueDate === addDays(today, 1)) return { label: "Tomorrow", tone: "bg-muted text-foreground" };
  const [year, month, day] = task.dueDate.split("-").map(Number);
  return { label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(year, month - 1, day)), tone: "bg-muted text-muted-foreground" };
}

function Option({ selected, onSelect, children, label }: { selected: boolean; onSelect: () => void; children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left motion-safe:transition-colors",
        selected ? "border-violet-500 bg-violet-500/10" : "border-border bg-background hover:bg-muted/60",
        focusRing,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", selected ? "border-violet-600 bg-violet-600 text-violet-50" : "border-muted-foreground/50")}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

/** Pick what to study: an open task (sorted by what's due first), free study, or a brand-new task. */
export function TaskPicker({ value, onChange }: { value: string; onChange: (taskId: string) => void }) {
  const { tasks } = useTasks();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const today = localDateString();

  const open = useMemo(() => tasks.filter((task) => !task.completedAt), [tasks]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? open.filter((task) => task.title.toLowerCase().includes(q)) : open;
  }, [open, query]);

  const shown = useMemo(() => {
    if (expanded || query) return filtered;
    const top = filtered.slice(0, COLLAPSED_COUNT);
    const selected = filtered.find((task) => task.id === value);
    return selected && !top.includes(selected) ? [...top, selected] : top;
  }, [filtered, expanded, query, value]);

  async function addTask(event: FormEvent) {
    event.preventDefault();
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: name, dueDate: today }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.task) throw new Error(payload?.error || "Unable to add task.");
      onChange(payload.task.id);
      setTitle("");
      setAdding(false);
      notifyTasksChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add task.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 flex w-full items-baseline justify-between gap-3 text-sm font-semibold text-foreground">
        <span>What will you work on?</span>
        <Link href="/tasks" className="text-xs font-medium text-violet-700 hover:underline dark:text-violet-300">Manage tasks</Link>
      </legend>

      <div role="radiogroup" aria-label="Choose a task" className="space-y-2">
        <Option selected={value === ""} onSelect={() => onChange("")} label="Free study, no task">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">Free study</span>
            <span className="block text-xs text-muted-foreground">Just track the time, no task</span>
          </span>
        </Option>

        {open.length > COLLAPSED_COUNT + 2 && expanded && (
          <label className="relative block">
            <span className="sr-only">Search tasks</span>
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your tasks"
              className={cn("h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground", focusRing)}
            />
          </label>
        )}

        {shown.map((task) => {
          const chip = dueChip(task, today);
          const studied = task.studiedSeconds ?? 0;
          return (
            <Option key={task.id} selected={value === task.id} onSelect={() => onChange(task.id)} label={task.title}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{task.title}</span>
                {studied > 0 && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Timer size={11} aria-hidden="true" /> Studied {duration(studied)}
                  </span>
                )}
              </span>
              {chip && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", chip.tone)}>{chip.label}</span>}
            </Option>
          );
        })}

        {filtered.length === 0 && open.length > 0 && <p className="px-1 text-sm text-muted-foreground">No task matches “{query}”.</p>}
        {open.length === 0 && (
          <p className="rounded-xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">You have no open tasks. Add one below, or study freely.</p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {filtered.length > shown.length && !expanded && (
          <button type="button" onClick={() => setExpanded(true)} className={cn("min-h-10 rounded-lg text-sm font-medium text-violet-700 hover:underline dark:text-violet-300", focusRing)}>
            Show all {filtered.length} tasks
          </button>
        )}
        {expanded && open.length > COLLAPSED_COUNT && (
          <button type="button" onClick={() => { setExpanded(false); setQuery(""); }} className={cn("min-h-10 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground", focusRing)}>
            Show fewer
          </button>
        )}
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-lg text-sm font-medium text-foreground hover:text-violet-700 dark:hover:text-violet-300", focusRing)}>
            <Plus size={15} aria-hidden="true" /> New task
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={addTask} className="mt-1 flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">New task name</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Escape") { setAdding(false); setTitle(""); } }}
              maxLength={180}
              placeholder="e.g. Solve chapter 4 questions"
              className={cn("h-11 w-full rounded-xl border border-border bg-background px-3 text-sm placeholder:text-muted-foreground", focusRing)}
            />
          </label>
          <button type="submit" disabled={busy || !title.trim()} className={cn("min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-violet-50 hover:bg-violet-500 disabled:opacity-50", focusRing)}>
            {busy ? "Adding…" : "Add"}
          </button>
        </form>
      )}
    </fieldset>
  );
}

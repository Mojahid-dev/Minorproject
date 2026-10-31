"use client";

import { useRef, useState, type FormEvent } from "react";
import { NotebookPen, Plus } from "lucide-react";
import { addDays } from "@/lib/dashboard-utils";
import { cn } from "@/lib/utils";
import { focusRing, panel } from "@/components/dashboard/shared";

type Props = {
  today: string | null;
  /** Date preselected for the current view ("" for none). */
  defaultDue: string;
  onAdd: (task: { title: string; notes: string | null; dueDate: string | null }) => Promise<void>;
};

export function TaskComposer({ today, defaultDue, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  // undefined = follow the current view's default; otherwise the person's choice.
  const [override, setOverride] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const due = override ?? defaultDue;
  const tomorrow = today ? addDays(today, 1) : "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      await onAdd({ title: value, notes: notes.trim() || null, dueDate: due || null });
      setTitle("");
      setNotes("");
      setNotesOpen(false);
      inputRef.current?.focus(); // keep going: add the next one right away
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add task.");
    } finally {
      setBusy(false);
    }
  }

  const chips: { label: string; value: string }[] = [
    { label: "Today", value: today ?? "" },
    { label: "Tomorrow", value: tomorrow },
    { label: "No date", value: "" },
  ];
  const isCustom = Boolean(due) && due !== today && due !== tomorrow;

  return (
    <form onSubmit={submit} className={cn(panel, "p-3 sm:p-4")}>
      <div className="flex gap-2">
        <label htmlFor="new-task-title" className="sr-only">
          New task
        </label>
        <input
          ref={inputRef}
          id="new-task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={180}
          autoComplete="off"
          placeholder="Add a task…"
          className={cn(
            "min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground",
            focusRing,
          )}
        />
        <button
          type="submit"
          disabled={!title.trim() || busy}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-violet-50 motion-safe:transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
            focusRing,
          )}
        >
          <Plus size={18} aria-hidden="true" />
          <span className="hidden sm:inline">{busy ? "Adding…" : "Add task"}</span>
          <span className="sr-only sm:hidden">Add task</span>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Due date">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Due</span>
        {chips.map((chip) => {
          const active = chip.label === "No date" ? !due : due === chip.value && Boolean(chip.value);
          return (
            <button
              key={chip.label}
              type="button"
              aria-pressed={active}
              onClick={() => setOverride(chip.value)}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium motion-safe:transition-colors",
                active
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-800 dark:text-violet-200"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                focusRing,
              )}
            >
              {chip.label}
            </button>
          );
        })}
        <label className="sr-only" htmlFor="new-task-date">
          Pick another date
        </label>
        <input
          id="new-task-date"
          type="date"
          value={isCustom ? due : ""}
          onChange={(event) => setOverride(event.target.value)}
          className={cn(
            "min-h-9 rounded-full border bg-background px-3 text-sm text-foreground",
            isCustom ? "border-violet-500/50" : "border-border text-muted-foreground",
            focusRing,
          )}
        />
        <button
          type="button"
          aria-expanded={notesOpen}
          onClick={() => setNotesOpen((open) => !open)}
          className={cn(
            "ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
            focusRing,
          )}
        >
          <NotebookPen size={15} aria-hidden="true" /> {notesOpen ? "Hide notes" : "Add notes"}
        </button>
      </div>

      {notesOpen && (
        <div className="mt-3">
          <label htmlFor="new-task-notes" className="sr-only">
            Notes
          </label>
          <textarea
            id="new-task-notes"
            rows={2}
            maxLength={5000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add a little context (optional)"
            className={cn(
              "w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground",
              focusRing,
            )}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

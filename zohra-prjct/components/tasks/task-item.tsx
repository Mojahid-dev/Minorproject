"use client";

import { useState, type FormEvent } from "react";
import {
  Calendar,
  CalendarClock,
  CalendarX2,
  Check,
  CircleAlert,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { localDateString, type TaskRecord } from "@/lib/task-utils";
import { addDays, overdueLabel } from "@/lib/dashboard-utils";
import { formatDay } from "@/lib/task-view";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { focusRing, primaryButton, secondaryButton } from "@/components/dashboard/shared";

export type TaskPatch = {
  title?: string;
  notes?: string | null;
  dueDate?: string | null;
  completed?: boolean;
};

type Props = {
  task: TaskRecord;
  today: string;
  /** Hide the due label when a group heading already says it. */
  showDue?: boolean;
  onPatch: (task: TaskRecord, patch: TaskPatch) => Promise<boolean>;
  onDelete: (task: TaskRecord) => void;
};

const fieldClass = cn(
  "mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground",
  focusRing,
);

function EditForm({
  task,
  onPatch,
  onClose,
}: {
  task: TaskRecord;
  onPatch: Props["onPatch"];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const ok = await onPatch(task, {
      title: title.trim(),
      notes: notes.trim() || null,
      dueDate: dueDate || null,
    });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className="space-y-3 bg-muted/40 px-3 py-4 sm:px-4"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <label className="text-sm font-medium">
          Task
          <input
            autoFocus
            required
            maxLength={180}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Notes <span className="font-normal text-muted-foreground">(optional)</span>
        <textarea
          rows={2}
          maxLength={5000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={cn(fieldClass, "min-h-0 py-2")}
        />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryButton}>
          Cancel
        </button>
        <button type="submit" disabled={busy || !title.trim()} className={cn(primaryButton, "disabled:opacity-60")}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

export function TaskItem({ task, today, showDue = true, onPatch, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const done = Boolean(task.completedAt);
  const late = !done && Boolean(task.dueDate && task.dueDate < today);

  if (editing)
    return (
      <li>
        <EditForm task={task} onPatch={onPatch} onClose={() => setEditing(false)} />
      </li>
    );

  return (
    <li className="group flex items-start gap-1 px-1 py-0.5 motion-safe:transition-colors hover:bg-muted/50 sm:px-2">
      {/* 44px hit area around a 20px visual control. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={task.title}
        onClick={() => void onPatch(task, { completed: !done })}
        className={cn("grid size-11 shrink-0 place-items-center rounded-xl", focusRing)}
      >
        <span
          className={cn(
            "grid size-5 place-items-center rounded-full border-2 motion-safe:transition-colors",
            done ? "border-emerald-600 bg-emerald-600 text-emerald-50" : "border-muted-foreground/60",
          )}
        >
          {done && <Check size={13} strokeWidth={3} aria-hidden="true" />}
        </span>
      </button>

      <div className="min-w-0 flex-1 py-2.5">
        <p
          className={cn(
            "text-sm leading-snug [overflow-wrap:anywhere]",
            done ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {task.title}
        </p>
        {task.notes && (
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
            {task.notes}
          </p>
        )}
        {showDue && (task.dueDate || done) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
            {late && task.dueDate ? (
              <span className="inline-flex items-center gap-1 font-medium text-destructive">
                <CircleAlert size={12} aria-hidden="true" /> {overdueLabel(task.dueDate, today)}
              </span>
            ) : task.dueDate ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Calendar size={12} aria-hidden="true" /> {formatDay(task.dueDate, today)}
              </span>
            ) : null}
            {done && task.completedAt && (
              <span className="text-emerald-800 dark:text-emerald-300">
                Completed {formatDay(localDateString(new Date(task.completedAt)), today).toLowerCase()}
              </span>
            )}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${task.title}`}
          className={cn(
            "mt-1 grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground motion-safe:transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted sm:size-9",
            focusRing,
          )}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          {task.dueDate !== today && (
            <DropdownMenuItem onClick={() => void onPatch(task, { dueDate: today })}>
              <CalendarClock /> Due today
            </DropdownMenuItem>
          )}
          {task.dueDate !== addDays(today, 1) && (
            <DropdownMenuItem onClick={() => void onPatch(task, { dueDate: addDays(today, 1) })}>
              <Calendar /> Due tomorrow
            </DropdownMenuItem>
          )}
          {task.dueDate && (
            <DropdownMenuItem onClick={() => void onPatch(task, { dueDate: null })}>
              <CalendarX2 /> Clear due date
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

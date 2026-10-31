"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Plus,
} from "lucide-react";
import {
  focusRing,
  InlineError,
  panel,
  primaryButton,
  secondaryButton,
} from "@/components/dashboard/shared";
import { useTasks } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import {
  formatTaskDate,
  localDateString,
  notifyTasksChanged,
  type TaskRecord,
} from "@/lib/task-utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS = 2;

function parseDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftDay(value: string, days: number) {
  const date = parseDay(value);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

function longDay(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(parseDay(value));
}

function relativeLabel(value: string, today: string) {
  if (value === today) return "Today";
  if (value === shiftDay(today, 1)) return "Tomorrow";
  if (value === shiftDay(today, -1)) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
    parseDay(value),
  );
}

/** Open tasks first, then by title, so the most useful ones show in a cell. */
function sortForCell(a: TaskRecord, b: TaskRecord) {
  return (
    Number(Boolean(a.completedAt)) - Number(Boolean(b.completedAt)) ||
    a.title.localeCompare(b.title)
  );
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
  const gridRef = useRef<HTMLDivElement>(null);
  const focusAfterMove = useRef(false);
  const today = localDateString();

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date,
        key: localDateString(date),
        inMonth: date.getMonth() === month.getMonth(),
      };
    });
  }, [month]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskRecord[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      map.set(task.dueDate, [...(map.get(task.dueDate) ?? []), task]);
    }
    for (const list of map.values()) list.sort(sortForCell);
    return map;
  }, [tasks]);

  const selectedTasks = tasksByDate.get(selectedDate) ?? [];
  const selectedOpen = selectedTasks.filter((task) => !task.completedAt);
  const selectedDone = selectedTasks.length - selectedOpen.length;

  const monthKey = `${month.getFullYear()}-${`${month.getMonth() + 1}`.padStart(2, "0")}`;
  const monthTasks = tasks.filter((task) => task.dueDate?.startsWith(monthKey));
  const monthDone = monthTasks.filter((task) => task.completedAt).length;
  const monthOpen = monthTasks.length - monthDone;
  const monthPercent = monthTasks.length
    ? Math.round((monthDone / monthTasks.length) * 100)
    : 0;
  const overdueCount = tasks.filter(
    (task) => task.dueDate && task.dueDate < today && !task.completedAt,
  ).length;
  const viewingThisMonth = monthKey === today.slice(0, 7);

  // After an arrow-key move, put focus on the newly selected day.
  useEffect(() => {
    if (!focusAfterMove.current) return;
    focusAfterMove.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${selectedDate}"]`)
      ?.focus();
  }, [selectedDate, month]);

  function goToMonth(offset: number) {
    setMonth(
      (value) => new Date(value.getFullYear(), value.getMonth() + offset, 1),
    );
  }

  function goToToday() {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(localDateString());
  }

  function selectDay(key: string, date: Date) {
    setSelectedDate(key);
    if (date.getMonth() !== month.getMonth()) {
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  function onGridKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -7
            : event.key === "ArrowDown"
              ? 7
              : 0;
    if (!step) return;
    event.preventDefault();
    const next = shiftDay(selectedDate, step);
    const date = parseDay(next);
    focusAfterMove.current = true;
    setSelectedDate(next);
    if (
      date.getMonth() !== month.getMonth() ||
      date.getFullYear() !== month.getFullYear()
    ) {
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

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
      if (!response.ok)
        throw new Error(payload.error || "Unable to create task.");
      notifyTasksChanged();
      setQuickTitle("");
      await refresh();
    } catch (caught) {
      setQuickError(
        caught instanceof Error ? caught.message : "Unable to create task.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] overflow-x-clip pb-10 text-foreground">
      {/* Header: title on the left, month controls on the right */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
            Calendar
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {monthLabel(month)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Change month"
            className="flex items-center rounded-xl border border-border bg-card shadow-sm"
          >
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => goToMonth(-1)}
              className={cn(
                "grid size-11 place-items-center rounded-l-xl text-muted-foreground hover:bg-muted hover:text-foreground",
                focusRing,
              )}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              disabled={viewingThisMonth && selectedDate === today}
              className={cn(
                "h-11 border-x border-border px-4 text-sm font-medium hover:bg-muted disabled:text-muted-foreground disabled:hover:bg-transparent",
                focusRing,
              )}
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => goToMonth(1)}
              className={cn(
                "grid size-11 place-items-center rounded-r-xl text-muted-foreground hover:bg-muted hover:text-foreground",
                focusRing,
              )}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          <Link href="/tasks" className={secondaryButton}>
            <ListChecks size={16} aria-hidden="true" /> All tasks
          </Link>
        </div>
      </header>

      {/* Month summary */}
      <section
        aria-label={`${monthLabel(month)} summary`}
        className={cn(
          panel,
          "mt-5 grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:px-5",
        )}
      >
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">
              {monthTasks.length
                ? `${monthDone} of ${monthTasks.length} done this month`
                : "Nothing scheduled this month"}
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {monthPercent}%
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Tasks completed this month"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={monthPercent}
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-violet-500 motion-safe:transition-[width] motion-safe:duration-500"
              style={{ width: `${monthPercent}%` }}
            />
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label="Open" value={monthOpen} />
          <Stat label="Done" value={monthDone} />
          <Stat
            label="Overdue"
            value={overdueCount}
            tone={overdueCount ? "danger" : "default"}
          />
        </dl>
      </section>

      <div className="mt-4 grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Month grid */}
        <section
          aria-label="Monthly task calendar"
          className={cn(panel, "min-w-0 overflow-hidden p-2 sm:p-4")}
        >
          {isLoading ? (
            <CalendarSkeleton />
          ) : error ? (
            <div className="p-3">
              <InlineError message={error} onRetry={() => void refresh()} />
            </div>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="grid grid-cols-7 pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
              >
                {WEEKDAYS.map((day) => (
                  <div key={day}>
                    <span className="sm:hidden">{day[0]}</span>
                    <span className="hidden sm:inline">{day}</span>
                  </div>
                ))}
              </div>
              <div
                ref={gridRef}
                role="group"
                aria-label={monthLabel(month)}
                onKeyDown={onGridKeyDown}
                className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border"
              >
                {days.map(({ date, key, inMonth }) => {
                  const dayTasks = tasksByDate.get(key) ?? [];
                  const openCount = dayTasks.filter(
                    (task) => !task.completedAt,
                  ).length;
                  const isSelected = key === selectedDate;
                  const isToday = key === today;
                  const isPast = key < today;
                  const hasOverdue = isPast && openCount > 0;
                  const shown = dayTasks.slice(0, MAX_CHIPS);
                  const hidden = dayTasks.length - shown.length;
                  return (
                    <button
                      key={key}
                      type="button"
                      data-date={key}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => selectDay(key, date)}
                      aria-pressed={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${longDay(key)}${
                        dayTasks.length
                          ? `, ${openCount} open of ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}`
                          : ""
                      }`}
                      className={cn(
                        "relative flex min-h-[54px] min-w-0 flex-col items-center gap-1 p-1 text-left motion-safe:transition-colors sm:min-h-[104px] sm:items-stretch sm:p-2 xl:min-h-[112px]",
                        "outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500",
                        inMonth ? "bg-card hover:bg-muted/60" : "bg-muted/40 hover:bg-muted/70",
                        isSelected &&
                          "z-[1] bg-violet-500/[0.08] ring-2 ring-inset ring-violet-500 hover:bg-violet-500/[0.12]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums sm:size-7 sm:text-[13px] sm:self-start",
                          inMonth ? "text-foreground" : "text-muted-foreground/60",
                          isToday &&
                            "bg-violet-600 font-semibold text-violet-50",
                        )}
                      >
                        {date.getDate()}
                      </span>

                      {/* Phones: dots only */}
                      {dayTasks.length > 0 && (
                        <span
                          aria-hidden="true"
                          className="flex items-center gap-0.5 sm:hidden"
                        >
                          {dayTasks.slice(0, 3).map((task) => (
                            <i
                              key={task.id}
                              className={cn(
                                "size-1.5 rounded-full",
                                task.completedAt
                                  ? "bg-muted-foreground/40"
                                  : hasOverdue
                                    ? "bg-rose-500"
                                    : "bg-violet-500",
                              )}
                            />
                          ))}
                        </span>
                      )}

                      {/* Tablets and up: task chips */}
                      {dayTasks.length > 0 && (
                        <span
                          aria-hidden="true"
                          className="hidden min-w-0 flex-col gap-1 sm:flex"
                        >
                          {shown.map((task) => (
                            <span
                              key={task.id}
                              className={cn(
                                "flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4",
                                task.completedAt
                                  ? "bg-muted text-muted-foreground"
                                  : isPast
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                    : "bg-violet-500/10 text-violet-700 dark:text-violet-300",
                              )}
                            >
                              {task.completedAt ? (
                                <Check size={10} className="shrink-0" />
                              ) : (
                                <i className="size-1.5 shrink-0 rounded-full bg-current" />
                              )}
                              <span
                                className={cn(
                                  "truncate",
                                  task.completedAt && "line-through",
                                )}
                              >
                                {task.title}
                              </span>
                            </span>
                          ))}
                          {hidden > 0 && (
                            <span className="px-1.5 text-[11px] font-medium text-muted-foreground">
                              +{hidden} more
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-full bg-violet-500" /> Open
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-full bg-rose-500" /> Overdue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-full bg-muted-foreground/40" />{" "}
                  Done
                </span>
                <span className="ml-auto hidden sm:inline">
                  Arrow keys move between days
                </span>
              </p>
            </>
          )}
        </section>

        {/* Agenda for the selected day */}
        <aside
          aria-label="Selected day agenda"
          className={cn(panel, "min-w-0 p-4 sm:p-5 xl:sticky xl:top-4")}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
            {relativeLabel(selectedDate, today)}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            {longDay(selectedDate)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {selectedTasks.length
              ? `${selectedOpen.length} open · ${selectedDone} done`
              : "Nothing scheduled"}
          </p>

          <form onSubmit={addForSelectedDate} className="mt-4 flex gap-2">
            <label className="sr-only" htmlFor="calendar-quick-add">
              Add task for {longDay(selectedDate)}
            </label>
            <input
              id="calendar-quick-add"
              value={quickTitle}
              onChange={(event) => setQuickTitle(event.target.value)}
              maxLength={180}
              placeholder="Add a task for this day"
              className={cn(
                "h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm placeholder:text-muted-foreground",
                focusRing,
              )}
            />
            <button
              aria-label="Add task"
              disabled={saving || !quickTitle.trim()}
              className={cn(
                primaryButton,
                "w-11 shrink-0 px-0 disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {saving ? (
                <span aria-hidden="true" className="text-xs">
                  …
                </span>
              ) : (
                <Plus size={18} aria-hidden="true" />
              )}
            </button>
          </form>
          {quickError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {quickError}
            </p>
          )}

          <ul className="mt-4 space-y-2">
            {selectedTasks.map((task) => (
              <AgendaItem
                key={task.id}
                task={task}
                today={today}
                onChanged={() => void refresh()}
              />
            ))}
          </ul>
          {selectedTasks.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium">A clear day</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a task above or pick another date.
              </p>
            </div>
          )}

          <Link
            href={`/tasks?date=${selectedDate}`}
            className={cn(secondaryButton, "mt-5 w-full justify-between")}
          >
            Open this day in Tasks <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger";
}) {
  return (
    <div className="min-w-[76px] rounded-xl bg-muted/60 px-3 py-2">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-xl font-semibold tabular-nums",
          tone === "danger" && "text-rose-600 dark:text-rose-300",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function AgendaItem({
  task,
  today,
  onChanged,
}: {
  task: TaskRecord;
  today: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const completed = Boolean(task.completedAt);
  const overdue = Boolean(task.dueDate && task.dueDate < today && !completed);

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Unable to update task.");
      notifyTasksChanged();
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update task.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-3",
        completed && "bg-muted/40",
      )}
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        aria-pressed={completed}
        aria-label={`${completed ? "Reopen" : "Complete"} ${task.title}`}
        className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 motion-safe:transition-colors disabled:opacity-50",
          completed
            ? "border-violet-600 bg-violet-600 text-violet-50"
            : "border-muted-foreground/50 text-transparent hover:border-violet-500 hover:text-violet-500/60",
          focusRing,
        )}
      >
        <Check size={13} strokeWidth={3} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "break-words text-sm font-medium leading-5",
            completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        {task.notes && (
          <p className="mt-0.5 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
            {task.notes}
          </p>
        )}
        {overdue && task.dueDate && (
          <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-300">
            Overdue since {formatTaskDate(task.dueDate)}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}

function CalendarSkeleton() {
  return (
    <div role="status" aria-label="Loading your calendar" className="p-1">
      <div className="mb-3 grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="mx-auto h-3 w-8 rounded bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {Array.from({ length: 42 }, (_, i) => (
          <div
            key={i}
            className="min-h-[54px] bg-card p-2 sm:min-h-[104px] xl:min-h-[112px]"
          >
            <div className="size-6 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

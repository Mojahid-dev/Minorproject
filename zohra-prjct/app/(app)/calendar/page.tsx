"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { InlineError } from "@/components/dashboard/shared";
import { useTasks } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import {
  formatTaskDate,
  localDateString,
  notifyTasksChanged,
  type TaskRecord,
} from "@/lib/task-utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_LINES = 3;

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-pen focus-visible:ring-offset-0";
/** A highlighter stroke across the lower half of the text it sits behind. */
const highlighter =
  "[background-image:linear-gradient(transparent_46%,var(--mark)_46%,var(--mark)_92%,transparent_92%)]";

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

function fullDay(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(parseDay(value));
}

/** "Today" / "Tomorrow" / "Yesterday", otherwise the weekday. */
function dayTitle(value: string, today: string) {
  if (value === today) return "Today";
  if (value === shiftDay(today, 1)) return "Tomorrow";
  if (value === shiftDay(today, -1)) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
    parseDay(value),
  );
}

function dayDetail(value: string, today: string) {
  const near = [today, shiftDay(today, 1), shiftDay(today, -1)].includes(value);
  return new Intl.DateTimeFormat(undefined, {
    ...(near ? { weekday: "long" } : {}),
    month: "long",
    day: "numeric",
  }).format(parseDay(value));
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
  const monthPercent = monthTasks.length
    ? Math.round((monthDone / monthTasks.length) * 100)
    : 0;
  const overdueCount = tasks.filter(
    (task) => task.dueDate && task.dueDate < today && !task.completedAt,
  ).length;
  const viewingToday = monthKey === today.slice(0, 7) && selectedDate === today;

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
    <div className="planner font-ui mx-auto w-full min-w-0 max-w-[1440px] overflow-x-clip pb-12 text-ink">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <h1 className="font-reading text-[40px] font-medium leading-none tracking-[-0.025em] sm:text-[56px]">
          {monthLabel(month)}
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => goToMonth(-1)}
            className={cn(
              "grid size-11 place-items-center rounded-md text-ink-soft hover:bg-ink/[0.06] hover:text-ink",
              focus,
            )}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => goToMonth(1)}
            className={cn(
              "grid size-11 place-items-center rounded-md text-ink-soft hover:bg-ink/[0.06] hover:text-ink",
              focus,
            )}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            disabled={viewingToday}
            className={cn(
              "ml-1 h-11 rounded-md border border-rule px-4 text-sm font-medium hover:border-ink disabled:border-transparent disabled:text-ink-soft",
              focus,
            )}
          >
            Today
          </button>
          <Link
            href="/tasks"
            className={cn(
              "ml-3 inline-flex h-11 items-center text-sm font-medium underline decoration-rule underline-offset-[6px] hover:decoration-ink",
              focus,
            )}
          >
            All tasks
          </Link>
        </div>
      </header>

      {/* Month progress: one sentence and a hairline, not a dashboard */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
        <p>
          {monthTasks.length
            ? `${monthDone} of ${monthTasks.length} tasks done`
            : "No tasks due this month"}
        </p>
        <div
          role="progressbar"
          aria-label="Tasks completed this month"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={monthPercent}
          className="h-px min-w-24 flex-1 bg-rule"
        >
          <div
            className="h-[3px] -translate-y-px bg-pen motion-safe:transition-[width] motion-safe:duration-700"
            style={{ width: `${monthPercent}%` }}
          />
        </div>
        {overdueCount > 0 && (
          <p className="inline-flex items-center gap-2 text-ink">
            <i aria-hidden="true" className="size-2 bg-flag" />
            {overdueCount} overdue
          </p>
        )}
      </div>

      <div className="mt-8 grid min-w-0 items-start gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-0">
        {/* Month ledger */}
        <section
          aria-label="Monthly task calendar"
          className="min-w-0 xl:pr-10"
        >
          {isLoading ? (
            <CalendarSkeleton />
          ) : error ? (
            <InlineError message={error} onRetry={() => void refresh()} />
          ) : (
            <>
              <div
                aria-hidden="true"
                className="grid grid-cols-7 border-b border-ink pb-2 text-[13px] text-ink-soft"
              >
                {WEEKDAYS.map((day) => (
                  <div key={day} className="px-1 sm:px-3">
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
                className="grid grid-cols-7"
              >
                {days.map(({ date, key, inMonth }) => {
                  const dayTasks = tasksByDate.get(key) ?? [];
                  const openCount = dayTasks.filter(
                    (task) => !task.completedAt,
                  ).length;
                  const isSelected = key === selectedDate;
                  const isToday = key === today;
                  const isPast = key < today;
                  const shown = dayTasks.slice(0, MAX_LINES);
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
                      aria-label={`${fullDay(key)}${
                        dayTasks.length
                          ? `, ${openCount} open of ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}`
                          : ""
                      }`}
                      className={cn(
                        "relative flex min-h-[62px] min-w-0 flex-col items-center gap-2 border-t border-rule px-1 pb-2 pt-2.5 text-left sm:min-h-[118px] sm:items-stretch sm:px-3 sm:pb-3 sm:pt-3 xl:min-h-[128px]",
                        "[&:not(:nth-child(7n+1))]:border-l [&:not(:nth-child(7n+1))]:border-l-rule/50",
                        "motion-safe:transition-colors hover:bg-ink/[0.035]",
                        "outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pen",
                        isSelected && "bg-ink/[0.045]",
                      )}
                    >
                      <span className="relative grid size-9 shrink-0 place-items-center sm:ml-1 sm:mt-1 sm:self-start">
                        {isToday && (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 40 40"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            className="absolute -inset-2 size-[calc(100%+16px)] overflow-visible text-pen"
                          >
                            <path
                              pathLength={1}
                              className="pen-draw"
                              d="M22 3.4C32.2 2.8 38.6 10.6 37.8 20.6 37 30.6 29.6 37.6 19.8 37 9.8 36.4 2.8 28.8 3.4 19.2 4 10.4 10.4 4.2 19.8 3.6 23 3.4 25.8 4 28 5.2"
                            />
                          </svg>
                        )}
                        <span
                          className={cn(
                            "font-reading relative text-[20px] font-medium leading-none tabular-nums sm:text-[24px]",
                            inMonth ? "text-ink" : "text-ink-soft/55",
                            isSelected && !isToday && cn(highlighter, "px-1"),
                            isSelected && isToday && highlighter,
                          )}
                        >
                          {date.getDate()}
                        </span>
                      </span>

                      {/* Phones: a short tick per task */}
                      {dayTasks.length > 0 && (
                        <span
                          aria-hidden="true"
                          className="flex items-center gap-[3px] sm:hidden"
                        >
                          {dayTasks.slice(0, 3).map((task) => (
                            <i
                              key={task.id}
                              className={cn(
                                "h-[3px] w-2.5",
                                task.completedAt
                                  ? "bg-ink-soft/40"
                                  : isPast
                                    ? "bg-flag"
                                    : "bg-ink",
                              )}
                            />
                          ))}
                        </span>
                      )}

                      {/* Tablets and up: the tasks themselves, as plain lines */}
                      {dayTasks.length > 0 && (
                        <span
                          aria-hidden="true"
                          className="hidden min-w-0 flex-col gap-1.5 sm:flex"
                        >
                          {shown.map((task) => (
                            <span
                              key={task.id}
                              className="flex min-w-0 items-start gap-2 text-[13px] leading-[1.3]"
                            >
                              <i
                                className={cn(
                                  "relative top-[5px] size-[7px] shrink-0 border",
                                  task.completedAt
                                    ? "border-ink-soft/50"
                                    : isPast
                                      ? "border-flag bg-flag"
                                      : "border-ink",
                                )}
                              />
                              <span
                                className={cn(
                                  "line-clamp-2 break-words",
                                  task.completedAt
                                    ? "text-ink-soft line-through decoration-ink-soft/60"
                                    : "text-ink",
                                )}
                              >
                                {task.title}
                              </span>
                            </span>
                          ))}
                          {hidden > 0 && (
                            <span className="text-xs text-ink-soft">
                              and {hidden} more
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-rule" />
              <p className="mt-3 hidden text-xs text-ink-soft sm:block">
                Use the arrow keys to move between days.
              </p>
            </>
          )}
        </section>

        {/* The selected day, written out beside a margin rule */}
        <section
          aria-label="Selected day"
          className="min-w-0 border-t-2 border-flag/50 pt-6 xl:sticky xl:top-4 xl:border-l-2 xl:border-t-0 xl:pl-8 xl:pt-1"
        >
          <h2 className="font-reading text-[34px] font-medium leading-none tracking-[-0.02em]">
            {dayTitle(selectedDate, today)}
          </h2>
          <p className="mt-2 text-[15px] text-ink-soft">
            {dayDetail(selectedDate, today)}
          </p>
          <p className="mt-1 text-sm text-ink-soft" aria-live="polite">
            {selectedTasks.length
              ? `${selectedOpen.length} to do, ${selectedDone} done`
              : "Nothing scheduled"}
          </p>

          <form
            onSubmit={addForSelectedDate}
            className="mt-6 flex items-end gap-3 border-b border-rule focus-within:border-ink"
          >
            <label className="sr-only" htmlFor="calendar-quick-add">
              Add a task for {fullDay(selectedDate)}
            </label>
            <input
              id="calendar-quick-add"
              value={quickTitle}
              onChange={(event) => setQuickTitle(event.target.value)}
              maxLength={180}
              placeholder="Add a task for this day"
              className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-soft"
            />
            <button
              disabled={saving || !quickTitle.trim()}
              className={cn(
                "mb-1 h-9 rounded-md px-3 text-sm font-semibold text-pen hover:bg-pen/10 disabled:text-ink-soft disabled:hover:bg-transparent",
                focus,
              )}
            >
              {saving ? "Adding" : "Add"}
            </button>
          </form>
          {quickError && (
            <p role="alert" className="mt-2 text-sm text-flag">
              {quickError}
            </p>
          )}

          {selectedTasks.length > 0 ? (
            <ul className="mt-2">
              {selectedTasks.map((task) => (
                <AgendaItem
                  key={task.id}
                  task={task}
                  today={today}
                  onChanged={() => void refresh()}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-6 max-w-[30ch] text-[15px] leading-6 text-ink-soft">
              Nothing is due. Add a task above, or pick another day.
            </p>
          )}

          <Link
            href={`/tasks?date=${selectedDate}`}
            className={cn(
              "mt-8 inline-flex text-sm font-medium underline decoration-rule underline-offset-[6px] hover:decoration-ink",
              focus,
            )}
          >
            Open this day in Tasks
          </Link>
        </section>
      </div>
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
    <li className="flex items-start gap-3.5 border-b border-rule py-3.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        aria-pressed={completed}
        aria-label={`${completed ? "Reopen" : "Complete"} ${task.title}`}
        className={cn(
          "relative mt-px grid size-[22px] shrink-0 place-items-center rounded-[4px] border-[1.5px] disabled:opacity-60",
          completed ? "border-pen" : "border-ink-soft hover:border-ink",
          focus,
        )}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[18px] text-pen"
        >
          <path
            pathLength={1}
            d="M4 13.5 9.5 19 20.5 5"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: completed ? 0 : 1,
              transition: "stroke-dashoffset 260ms ease-out",
            }}
          />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "w-fit max-w-full break-words text-[15px] leading-[1.4] [background-image:linear-gradient(currentColor,currentColor)] [background-position:0_62%] [background-repeat:no-repeat] motion-safe:transition-[background-size,color] motion-safe:duration-300",
            completed
              ? "text-ink-soft [background-size:100%_1.5px]"
              : "text-ink [background-size:0%_1.5px]",
          )}
        >
          {task.title}
        </p>
        {task.notes && (
          <p className="mt-1 line-clamp-2 break-words text-[13px] leading-5 text-ink-soft">
            {task.notes}
          </p>
        )}
        {overdue && task.dueDate && (
          <p className="mt-1.5 inline-flex items-center gap-2 text-[13px] text-flag">
            <i aria-hidden="true" className="size-[7px] bg-flag" />
            Due {formatTaskDate(task.dueDate)}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-[13px] text-flag">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}

function CalendarSkeleton() {
  return (
    <div role="status" aria-label="Loading your calendar">
      <div className="border-b border-ink pb-2 text-[13px] text-transparent">
        .
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="h-[62px] animate-pulse border-t border-rule sm:h-[118px] xl:h-[128px]"
        />
      ))}
    </div>
  );
}

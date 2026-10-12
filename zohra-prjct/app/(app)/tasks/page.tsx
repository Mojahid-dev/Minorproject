"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCheck,
  CircleAlert,
  ListTodo,
  Plus,
  Sparkles,
} from "lucide-react";
import { TaskRow } from "@/components/task-row";
import { useTasks } from "@/hooks/use-tasks";
import {
  formatTaskDate,
  localDateString,
  notifyTasksChanged,
} from "@/lib/task-utils";

type TaskView = "today" | "upcoming" | "unscheduled" | "completed" | "date";

function requestedDate() {
  if (typeof window === "undefined") return "";
  const value = new URLSearchParams(window.location.search).get("date") ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export default function TasksPage() {
  const { tasks, isLoading, error, refresh } = useTasks();
  const [selectedDate, setSelectedDate] = useState(
    () => requestedDate() || localDateString(),
  );
  const [view, setView] = useState<TaskView>(() =>
    requestedDate() && requestedDate() !== localDateString() ? "date" : "today",
  );
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(() => requestedDate());
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const today = localDateString();

  const openTasks = useMemo(
    () => tasks.filter((task) => !task.completedAt),
    [tasks],
  );
  const dueToday = tasks.filter((task) => task.dueDate === today);
  const openToday = dueToday.filter((task) => !task.completedAt).length;
  const overdue = openTasks.filter(
    (task) => task.dueDate && task.dueDate < today,
  );
  const upcoming = openTasks.filter(
    (task) => task.dueDate && task.dueDate > today,
  );
  const unscheduled = openTasks.filter((task) => !task.dueDate);
  const completed = tasks.filter((task) => Boolean(task.completedAt));
  const completionRate = tasks.length
    ? Math.round((completed.length / tasks.length) * 100)
    : 0;

  const tabs: { id: TaskView; label: string; count: number }[] = [
    { id: "today", label: "Today", count: dueToday.length },
    {
      id: "upcoming",
      label: "Upcoming",
      count: overdue.length + upcoming.length,
    },
    { id: "unscheduled", label: "Unscheduled", count: unscheduled.length },
    { id: "completed", label: "Completed", count: completed.length },
  ];

  let visibleTasks =
    view === "today"
      ? dueToday
      : view === "upcoming"
        ? [...overdue, ...upcoming]
        : view === "unscheduled"
          ? unscheduled
          : view === "completed"
            ? completed
            : tasks.filter((task) => task.dueDate === selectedDate);
  if (view === "upcoming")
    visibleTasks = [...visibleTasks].sort((a, b) =>
      (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
    );

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    setFormError("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          notes: notes || null,
          dueDate: dueDate || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Unable to create task.");
      notifyTasksChanged();
      setTitle("");
      setNotes("");
      setDueDate("");
      await refresh();
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : "Unable to create task.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] overflow-x-clip pb-10 text-white">
      <header className="relative isolate flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#1a1b20] to-[#111214] p-4 sm:rounded-[28px] sm:p-7">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-32 -z-10 size-80 rounded-full bg-[radial-gradient(circle,rgba(196,181,253,0.16),transparent_68%)]"
        />
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-violet-200">
            <Sparkles size={14} /> Your planner
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.055em] sm:text-5xl">
            Make room for focus.
          </h1>
          <p className="mt-2 text-sm text-neutral-300">
            Today, {formatTaskDate(today)}{" "}
            <span className="px-1 text-neutral-600">·</span> Keep your next step
            clear and your week in reach.
          </p>
        </div>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-violet-100"
        >
          <CalendarDays size={17} /> Open calendar <ArrowRight size={15} />
        </Link>
      </header>

      <div className="mt-3 grid w-full min-w-0 grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
        <TaskMetric
          icon={CalendarDays}
          label="Due today"
          value={dueToday.length}
          detail={
            dueToday.length
              ? `${dueToday.filter((task) => task.completedAt).length} completed`
              : "Nothing on the list"
          }
          tone="violet"
        />
        <TaskMetric
          icon={CircleAlert}
          label="Overdue"
          value={overdue.length}
          detail={
            overdue.length ? "Bring these back into focus" : "You’re up to date"
          }
          tone={overdue.length ? "rose" : "neutral"}
        />
        <TaskMetric
          icon={CheckCheck}
          label="Completed"
          value={completed.length}
          detail={
            tasks.length
              ? `${completionRate}% of all tasks`
              : "Your first win is waiting"
          }
          tone="emerald"
        />
      </div>

      <form
        onSubmit={createTask}
        className="mt-4 w-full min-w-0 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#191a1d] to-[#111214] p-3 sm:mt-7 sm:p-5"
      >
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-200">
          <Plus size={17} /> Quick add a task
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-3 md:grid-cols-[minmax(0,1fr)_190px_auto]">
          <label className="sr-only" htmlFor="new-task-title">
            Task title
          </label>
          <input
            id="new-task-title"
            required
            maxLength={180}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What do you need to do?"
            className="col-span-2 h-11 min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-neutral-400 md:col-span-1"
          />
          <label className="sr-only" htmlFor="new-task-date">
            Due date
          </label>
          <input
            id="new-task-date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="h-11 min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-xs text-neutral-200 outline-none focus:border-neutral-400 sm:px-3 sm:text-sm"
          />
          <button
            disabled={isSaving || !title.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Adding…" : "Add task"}
            <ArrowRight size={16} />
          </button>
        </div>
        <label className="mt-3 block text-xs text-neutral-500">
          Notes (optional)
          <textarea
            maxLength={5000}
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add a little context"
            className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-zinc-600"
          />
        </label>
        {formError && (
          <p role="alert" className="mt-2 text-sm text-red-300">
            {formError}
          </p>
        )}
      </form>

      <div className="mt-4 grid w-full min-w-0 grid-cols-1 items-start gap-3 sm:mt-5 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="w-full min-w-0 rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#17181c] to-[#101114] p-3.5 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <ListTodo size={17} />{" "}
                {view === "date" ? "Selected day" : "Personal tasks"}
              </div>
              <h2 className="mt-1.5 text-xl font-semibold">
                {view === "date" ? formatTaskDate(selectedDate) : "Your tasks"}
              </h2>
            </div>
            {view === "date" && (
              <button
                onClick={() => {
                  setView("today");
                  setSelectedDate(today);
                }}
                className="rounded-lg px-3 py-2 text-xs text-neutral-300 hover:bg-white/10"
              >
                Back to today
              </button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-b border-zinc-800 pb-4 sm:flex sm:flex-wrap sm:gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                aria-pressed={view === tab.id}
                className={`flex min-h-10 w-full min-w-0 items-center justify-between rounded-xl px-2.5 py-2 text-xs transition sm:w-auto sm:shrink-0 sm:justify-start sm:rounded-lg sm:px-3 sm:text-sm ${view === tab.id ? "bg-white text-black" : "bg-white/[0.035] text-neutral-400 hover:bg-white/10 hover:text-white"}`}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={`ml-1.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] sm:ml-2 sm:text-xs ${view === tab.id ? "bg-black/10" : "bg-white/[0.07]"}`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              Loading your tasks…
            </p>
          ) : error ? (
            <div className="py-8 text-center">
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
              <button
                onClick={() => void refresh()}
                className="mt-3 rounded-lg bg-white/[0.08] px-3 py-2 text-sm"
              >
                Try again
              </button>
            </div>
          ) : view === "upcoming" && visibleTasks.length === 0 ? (
            <EmptyTasks message="No overdue or upcoming tasks. You’re all caught up." />
          ) : visibleTasks.length === 0 ? (
            <EmptyTasks
              message={
                view === "completed"
                  ? "Completed tasks will appear here."
                  : view === "unscheduled"
                    ? "Tasks without due dates will appear here."
                    : view === "date"
                      ? "No tasks are scheduled for this date."
                      : "Nothing due today. Add a task above or enjoy the breathing room."
              }
            />
          ) : (
            <div className="mt-4 space-y-2">
              {view === "upcoming" && overdue.length > 0 && (
                <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-rose-300">
                  Overdue
                </p>
              )}
              {visibleTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onChanged={() => void refresh()}
                />
              ))}
            </div>
          )}
        </section>
        <aside className="w-full min-w-0 space-y-4 xl:sticky xl:top-24">
          <section className="relative isolate w-full min-w-0 overflow-hidden rounded-3xl border border-violet-200/10 bg-[#17151e] p-4 sm:p-5">
            <div
              aria-hidden="true"
              className="absolute -right-14 -top-16 -z-10 size-44 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.2),transparent_70%)]"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
              Today’s focus
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {openToday === 0 ? "Clear space." : `${openToday} to go.`}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              {dueToday.length
                ? `${dueToday.length - openToday} of ${dueToday.length} tasks complete`
                : "You haven’t scheduled anything for today."}
            </p>
            <div
              className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.08]"
              role="progressbar"
              aria-label="Today’s task progress"
              aria-valuemin={0}
              aria-valuemax={dueToday.length || 1}
              aria-valuenow={dueToday.length - openToday}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-300 to-sky-200 transition-all"
                style={{
                  width: `${dueToday.length ? ((dueToday.length - openToday) / dueToday.length) * 100 : 0}%`,
                }}
              />
            </div>
            <Link
              href={`/calendar?date=${today}`}
              className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-neutral-200 transition hover:bg-white/[0.06]"
            >
              See today in Calendar <ArrowRight size={15} />
            </Link>
          </section>
          <section className="w-full min-w-0 rounded-3xl border border-white/[0.08] bg-[#141518] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
                  Coming up
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Next on your list
                </h2>
              </div>
              <CalendarDays size={18} className="text-neutral-400" />
            </div>
            {upcoming.length ? (
              <div className="mt-4 space-y-2">
                {[...upcoming]
                  .sort((a, b) =>
                    (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
                  )
                  .slice(0, 3)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="flex min-w-0 items-center gap-3 rounded-xl bg-white/[0.035] p-3"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-xs text-neutral-300">
                        {task.dueDate
                          ? new Date(`${task.dueDate}T00:00:00`).getDate()
                          : "·"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-neutral-200">
                          {task.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-neutral-500">
                          {task.dueDate
                            ? formatTaskDate(task.dueDate)
                            : "No due date"}
                        </span>
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-zinc-800 px-3 py-5 text-center text-sm text-neutral-500">
                Add a due date to see what’s next.
              </p>
            )}
            <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs leading-5 text-neutral-500">
              {completionRate}% of your tasks are complete. Keep your plan small
              enough to move forward.
            </p>
          </section>
        </aside>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 text-xs text-neutral-500">
        <span>
          {openTasks.length} active task{openTasks.length === 1 ? "" : "s"}
        </span>
        <span>Due dates use your local calendar day.</span>
      </div>
    </div>
  );
}

function TaskMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: number;
  detail: string;
  tone: "violet" | "rose" | "emerald" | "neutral";
}) {
  const accents = {
    violet: "bg-violet-300/10 text-violet-200",
    rose: "bg-rose-300/10 text-rose-200",
    emerald: "bg-emerald-300/10 text-emerald-200",
    neutral: "bg-white/[0.07] text-neutral-200",
  };
  return (
    <div className="w-full min-w-0 rounded-2xl border border-white/[0.07] bg-[#151619] p-2.5 sm:flex sm:items-center sm:gap-3 sm:p-4">
      <span
        className={`hidden size-10 shrink-0 place-items-center rounded-xl sm:grid ${accents[tone]}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] text-neutral-400 sm:text-xs">
          {label}
        </p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 sm:justify-between sm:gap-2">
          <span className="text-xl font-semibold text-white sm:text-2xl">
            {value}
          </span>
          <span className="hidden truncate text-[11px] text-neutral-500 sm:block">
            {detail}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyTasks({ message }: { message: string }) {
  return (
    <div className="grid min-h-40 w-full min-w-0 place-items-center px-2 text-center sm:px-4">
      <div className="w-full min-w-0">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-white/[0.06] text-neutral-400">
          <ListTodo size={20} />
        </span>
        <p className="mx-auto mt-3 max-w-[34ch] break-words text-sm leading-6 text-neutral-400">
          {message}
        </p>
      </div>
    </div>
  );
}

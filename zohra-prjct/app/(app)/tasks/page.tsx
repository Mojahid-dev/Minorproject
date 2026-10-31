"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, CalendarCheck, ListTodo, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useTasks } from "@/hooks/use-tasks";
import { useClock } from "@/hooks/use-clock";
import {
  isDateOnly,
  localDateString,
  notifyTasksChanged,
  type TaskRecord,
} from "@/lib/task-utils";
import { parseDateOnly, plural } from "@/lib/dashboard-utils";
import { bucketTasks, dayHeading, groupByDate, type TaskView } from "@/lib/task-view";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineError, focusRing, panel, secondaryButton } from "@/components/dashboard/shared";
import { WeekStrip } from "@/components/dashboard/week-strip";
import { TaskComposer } from "@/components/tasks/task-composer";
import { TaskItem, type TaskPatch } from "@/components/tasks/task-item";
import { ProgressPanel } from "@/components/tasks/progress-panel";
import { cn } from "@/lib/utils";

const DONE_PAGE = 25;
const fullDate = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

function parseView(value: string | null): TaskView {
  return value === "upcoming" || value === "nodate" || value === "done" ? value : "today";
}

export default function TasksPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TasksContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5" aria-busy="true" aria-label="Loading tasks">
      <Skeleton className="h-14 w-64" />
      <Skeleton className="h-28" />
      <Skeleton className="h-72" />
    </div>
  );
}

function TasksContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = useClock();
  const today = now ? localDateString(new Date(now)) : null;

  const { tasks, setTasks, isLoading, error, refresh } = useTasks();
  const [doneLimit, setDoneLimit] = useState(DONE_PAGE);

  const view = parseView(searchParams.get("view"));
  const dateParam = searchParams.get("date");
  // ?date=YYYY-MM-DD shows a single day (the calendar links here).
  const dayView = dateParam && isDateOnly(dateParam) && dateParam !== today ? dateParam : null;

  const navigate = useCallback(
    (next: { view?: TaskView; date?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.view !== undefined) {
        if (next.view === "today") params.delete("view");
        else params.set("view", next.view);
      }
      if (next.date !== undefined) {
        if (next.date) params.set("date", next.date);
        else params.delete("date");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // ---- sync with changes made elsewhere (sidebar, other pages) ------------
  const ownChange = useRef(false);
  const emitChanged = useCallback(() => {
    ownChange.current = true; // dispatch is synchronous; our own listener skips it
    notifyTasksChanged();
    ownChange.current = false;
  }, []);

  useEffect(() => {
    const onChanged = () => {
      if (!ownChange.current) void refresh();
    };
    window.addEventListener("zohra:tasks-updated", onChanged);
    return () => window.removeEventListener("zohra:tasks-updated", onChanged);
  }, [refresh]);

  // ---- mutations (optimistic, with rollback) ------------------------------
  const patchTask = useCallback(
    async (task: TaskRecord, patch: TaskPatch): Promise<boolean> => {
      const optimistic: Partial<TaskRecord> = {};
      if (patch.title !== undefined) optimistic.title = patch.title;
      if (patch.notes !== undefined) optimistic.notes = patch.notes;
      if (patch.dueDate !== undefined) optimistic.dueDate = patch.dueDate;
      if (patch.completed !== undefined)
        optimistic.completedAt = patch.completed ? new Date().toISOString() : null;

      setTasks((current) =>
        current.map((item) => (item.id === task.id ? { ...item, ...optimistic } : item)),
      );
      try {
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const payload: unknown = await response.json().catch(() => null);
        const updated = (payload as { task?: TaskRecord } | null)?.task;
        if (!response.ok || !updated) {
          const message = (payload as { error?: string } | null)?.error;
          throw new Error(message || "Unable to update task.");
        }
        setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        emitChanged();
        return true;
      } catch (caught) {
        setTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
        toast.error(caught instanceof Error ? caught.message : "Unable to update task.");
        return false;
      }
    },
    [setTasks, emitChanged],
  );

  const createTask = useCallback(
    async (input: { title: string; notes: string | null; dueDate: string | null }) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload: unknown = await response.json().catch(() => null);
      const created = (payload as { task?: TaskRecord } | null)?.task;
      if (!response.ok || !created) {
        const message = (payload as { error?: string } | null)?.error;
        throw new Error(message || "Unable to create task.");
      }
      setTasks((current) => [...current, created]);
      emitChanged();
      return created;
    },
    [setTasks, emitChanged],
  );

  const deleteTask = useCallback(
    async (task: TaskRecord) => {
      setTasks((current) => current.filter((item) => item.id !== task.id));
      try {
        const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Unable to delete task.");
        emitChanged();
        toast("Task deleted", {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                const restored = await createTask({
                  title: task.title,
                  notes: task.notes,
                  dueDate: task.dueDate,
                });
                if (task.completedAt) await patchTask(restored, { completed: true });
              } catch {
                toast.error("Couldn't restore that task.");
              }
            },
          },
        });
      } catch (caught) {
        setTasks((current) => [...current, task]);
        toast.error(caught instanceof Error ? caught.message : "Unable to delete task.");
      }
    },
    [setTasks, emitChanged, createTask, patchTask],
  );

  // ---- derived data -------------------------------------------------------
  const ready = Boolean(today) && !isLoading;
  const buckets = useMemo(
    () =>
      today && now
        ? bucketTasks(tasks, today, now)
        : { overdue: [], today: [], upcoming: [], nodate: [], done: [], doneThisWeek: 0 },
    [tasks, today, now],
  );

  const openToday = buckets.today.filter((task) => !task.completedAt).length;
  const doneToday = buckets.today.length - openToday;
  const actionable = buckets.overdue.length + openToday;

  const summary = !ready || error
    ? ""
    : actionable === 0
      ? "You're all caught up."
      : [
          buckets.overdue.length ? `${buckets.overdue.length} overdue` : null,
          openToday ? `${plural(openToday, "task")} left today` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  async function moveOverdueToToday() {
    if (!today) return;
    const list = buckets.overdue;
    const results = await Promise.all(list.map((task) => patchTask(task, { dueDate: today })));
    const moved = results.filter(Boolean).length;
    if (moved) toast.success(`Moved ${plural(moved, "task")} to today`);
  }

  // ---- tabs ----------------------------------------------------------------
  const tabs: { id: TaskView; label: string; count: number; emphasis?: boolean }[] = [
    { id: "today", label: "Today", count: actionable, emphasis: true },
    { id: "upcoming", label: "Upcoming", count: buckets.upcoming.length },
    { id: "nodate", label: "No date", count: buckets.nodate.length },
    { id: "done", label: "Done", count: buckets.done.length },
  ];
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onTabKeyDown(event: React.KeyboardEvent, index: number) {
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : event.key === "ArrowRight"
            ? (index + 1) % tabs.length
            : event.key === "ArrowLeft"
              ? (index - 1 + tabs.length) % tabs.length
              : -1;
    if (target < 0) return;
    event.preventDefault();
    navigate({ view: tabs[target].id, date: null });
    tabRefs.current[tabs[target].id]?.focus();
  }

  const defaultDue = dayView ?? (view === "today" ? (today ?? "") : "");

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-5 pb-10 sm:space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Tasks</h1>
          <div className="mt-1.5 min-h-5 text-sm text-muted-foreground" aria-live="polite">
            {ready || error ? summary : <Skeleton className="h-4 w-48 rounded-md" aria-hidden="true" />}
          </div>
        </div>
        <Link href="/calendar" className={cn(secondaryButton, "w-full sm:w-auto")}>
          <CalendarDays size={17} aria-hidden="true" /> Open calendar
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <TaskComposer today={today} defaultDue={defaultDue} onAdd={async (input) => void (await createTask(input))} />

          <section className={cn(panel, "overflow-hidden")} aria-label="Task list">
            {dayView && today ? (
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
                    {fullDate.format(parseDateOnly(dayView))}
                  </h2>
                  <p className="text-xs text-muted-foreground">Tasks due on this day</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ date: null, view: "today" })}
                  className={cn(secondaryButton, "min-h-9 shrink-0 px-3 text-xs")}
                >
                  <ArrowLeft size={14} aria-hidden="true" /> Back to today
                </button>
              </div>
            ) : (
              <div
                role="tablist"
                aria-label="Task views"
                className="flex overflow-x-auto border-b border-border px-1 [scrollbar-width:none] sm:gap-1 sm:px-3 [&::-webkit-scrollbar]:hidden"
              >
                {tabs.map(({ id, label, count, emphasis }, index) => {
                  const selected = view === id;
                  return (
                    <button
                      key={id}
                      ref={(element) => {
                        tabRefs.current[id] = element;
                      }}
                      id={`task-tab-${id}`}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      aria-controls="task-panel"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => navigate({ view: id, date: null })}
                      onKeyDown={(event) => onTabKeyDown(event, index)}
                      className={cn(
                        "-mb-px inline-flex min-h-12 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-sm font-medium motion-safe:transition-colors sm:gap-2 sm:px-3",
                        selected
                          ? "border-violet-600 text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                        focusRing,
                      )}
                    >
                      {label}
                      {ready && count > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                            // Phones: counts only on the active tab and Today, so all four tabs fit.
                            !selected && !emphasis && "hidden sm:inline-block",
                            emphasis && buckets.overdue.length > 0
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div id="task-panel" role="tabpanel" aria-labelledby={dayView ? undefined : `task-tab-${view}`}>
              {!ready ? (
                <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading tasks">
                  <Skeleton className="h-11" />
                  <Skeleton className="h-11" />
                  <Skeleton className="h-11" />
                </div>
              ) : error ? (
                <div className="p-4">
                  <InlineError message={error} onRetry={() => void refresh()} />
                </div>
              ) : (
                <TaskLists
                  view={view}
                  dayView={dayView}
                  today={today!}
                  tasks={tasks}
                  buckets={buckets}
                  openToday={openToday}
                  doneLimit={doneLimit}
                  onMore={() => setDoneLimit((limit) => limit + DONE_PAGE)}
                  onPatch={patchTask}
                  onDelete={(task) => void deleteTask(task)}
                  onMoveOverdue={() => void moveOverdueToToday()}
                />
              )}
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-5 sm:space-y-6 lg:sticky lg:top-4 lg:self-start">
          <ProgressPanel
            loading={!ready}
            total={buckets.today.length}
            done={doneToday}
            overdue={buckets.overdue.length}
            doneThisWeek={buckets.doneThisWeek}
            onShowOverdue={() => navigate({ view: "today", date: null })}
          />
          <WeekStrip tasks={tasks} upcoming={buckets.upcoming} today={today} loading={!ready} />
        </div>
      </div>
    </div>
  );
}

function GroupHeading({
  primary,
  secondary,
  count,
  tone = "default",
  action,
}: {
  primary: string;
  secondary?: string;
  count?: number;
  tone?: "default" | "danger";
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-2">
      <h3
        className={cn(
          "flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wide",
          tone === "danger" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {primary}
        {secondary && <span className="font-normal normal-case tracking-normal">{secondary}</span>}
        {typeof count === "number" && <span className="font-medium">· {count}</span>}
      </h3>
      {action}
    </div>
  );
}

function EmptyView({ title, hint, icon: Icon = ListTodo }: { title: string; hint: string; icon?: typeof ListTodo }) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

type ListProps = {
  view: TaskView;
  dayView: string | null;
  today: string;
  tasks: TaskRecord[];
  buckets: ReturnType<typeof bucketTasks>;
  openToday: number;
  doneLimit: number;
  onMore: () => void;
  onPatch: (task: TaskRecord, patch: TaskPatch) => Promise<boolean>;
  onDelete: (task: TaskRecord) => void;
  onMoveOverdue: () => void;
};

function TaskLists({
  view,
  dayView,
  today,
  tasks,
  buckets,
  openToday,
  doneLimit,
  onMore,
  onPatch,
  onDelete,
  onMoveOverdue,
}: ListProps) {
  const row = (task: TaskRecord, showDue = false) => (
    <TaskItem key={task.id} task={task} today={today} showDue={showDue} onPatch={onPatch} onDelete={onDelete} />
  );
  const list = (items: TaskRecord[], showDue = false) => (
    <ul className="divide-y divide-border/60">{items.map((task) => row(task, showDue))}</ul>
  );

  if (dayView) {
    const items = tasks
      .filter((task) => task.dueDate === dayView)
      .sort(
        (a, b) =>
          Number(Boolean(a.completedAt)) - Number(Boolean(b.completedAt)) ||
          a.createdAt.localeCompare(b.createdAt),
      );
    return items.length ? (
      list(items)
    ) : (
      <EmptyView title="Nothing scheduled" hint="No tasks are due on this day. Add one above and it will land here." />
    );
  }

  if (view === "today") {
    const hasOverdue = buckets.overdue.length > 0;
    if (!hasOverdue && buckets.today.length === 0)
      return <EmptyView title="Nothing due today" hint="Add a task above, or enjoy the breathing room." />;
    return (
      <>
        {hasOverdue && (
          <section aria-label="Overdue">
            <GroupHeading
              primary="Overdue"
              count={buckets.overdue.length}
              tone="danger"
              action={
                <button
                  type="button"
                  onClick={onMoveOverdue}
                  className={cn(
                    "inline-flex min-h-8 items-center rounded-lg px-2 text-xs font-semibold text-violet-700 hover:bg-violet-500/10 dark:text-violet-300",
                    focusRing,
                  )}
                >
                  Move all to today
                </button>
              }
            />
            {list(buckets.overdue, true)}
          </section>
        )}
        {buckets.today.length > 0 && (
          <section aria-label="Due today">
            {hasOverdue && <GroupHeading primary="Due today" count={buckets.today.length} />}
            {list(buckets.today)}
          </section>
        )}
        {openToday === 0 && !hasOverdue && buckets.today.length > 0 && (
          <p className="flex items-center gap-2 border-t border-border bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-300">
            <PartyPopper size={18} aria-hidden="true" /> You&apos;re all caught up. Nice work.
          </p>
        )}
      </>
    );
  }

  if (view === "upcoming") {
    if (!buckets.upcoming.length)
      return (
        <EmptyView
          icon={CalendarCheck}
          title="Nothing coming up"
          hint="Give a task a due date and it will show up here, grouped by day."
        />
      );
    return (
      <>
        {groupByDate(buckets.upcoming).map((group) => {
          const heading = dayHeading(group.date, today);
          return (
            <section key={group.date} aria-label={heading.primary}>
              <GroupHeading primary={heading.primary} secondary={heading.secondary} count={group.tasks.length} />
              {list(group.tasks)}
            </section>
          );
        })}
      </>
    );
  }

  if (view === "nodate") {
    return buckets.nodate.length ? (
      list(buckets.nodate)
    ) : (
      <EmptyView title="Every task has a date" hint="Tasks without a due date will collect here until you schedule them." />
    );
  }

  const shown = buckets.done.slice(0, doneLimit);
  return buckets.done.length ? (
    <>
      {list(shown, true)}
      {buckets.done.length > shown.length && (
        <div className="border-t border-border p-3 text-center">
          <button type="button" onClick={onMore} className={cn(secondaryButton, "min-h-10")}>
            Show {Math.min(DONE_PAGE, buckets.done.length - shown.length)} more
          </button>
        </div>
      )}
    </>
  ) : (
    <EmptyView title="No completed tasks yet" hint="Tick a task off and your wins will be listed here." />
  );
}

import type { TaskRecord } from "@/lib/task-utils";
import { addDays, daysBetween, parseDateOnly } from "@/lib/dashboard-utils";

export type TaskView = "today" | "upcoming" | "nodate" | "done";

const weekdayLong = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const shortDate = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const shortDateYear = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "Today", "Tomorrow", "Friday" (this week) or "Fri, Nov 14". */
export function formatDay(due: string, today: string): string {
  const diff = daysBetween(today, due);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const date = parseDateOnly(due);
  if (diff > 1 && diff < 7) return weekdayLong.format(date);
  const sameYear = date.getFullYear() === parseDateOnly(today).getFullYear();
  return (sameYear ? shortDate : shortDateYear).format(date);
}

const monthDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/** Group heading: a friendly name plus the exact date when the name is relative. */
export function dayHeading(due: string, today: string) {
  const primary = formatDay(due, today);
  const diff = daysBetween(today, due);
  const date = parseDateOnly(due);
  // "Tomorrow" needs the weekday too; "Monday" already has it, so show just the date.
  const secondary =
    diff >= 0 && diff <= 1 ? shortDate.format(date) : diff > 1 && diff < 7 ? monthDay.format(date) : "";
  return { primary, secondary };
}

export type TaskBuckets = {
  overdue: TaskRecord[];
  /** Everything due today, open tasks first. */
  today: TaskRecord[];
  upcoming: TaskRecord[];
  nodate: TaskRecord[];
  done: TaskRecord[];
  doneThisWeek: number;
};

const byCreated = (a: TaskRecord, b: TaskRecord) => a.createdAt.localeCompare(b.createdAt);
const byDue = (a: TaskRecord, b: TaskRecord) =>
  (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || byCreated(a, b);

export function bucketTasks(tasks: TaskRecord[], today: string, nowMs: number): TaskBuckets {
  const overdue: TaskRecord[] = [];
  const dueToday: TaskRecord[] = [];
  const upcoming: TaskRecord[] = [];
  const nodate: TaskRecord[] = [];
  const done: TaskRecord[] = [];
  const weekAgo = nowMs - 7 * 86_400_000;
  let doneThisWeek = 0;

  for (const task of tasks) {
    if (task.completedAt) {
      done.push(task);
      if (new Date(task.completedAt).getTime() >= weekAgo) doneThisWeek += 1;
      // Finished tasks that were due today stay visible in Today, struck through.
      if (task.dueDate === today) dueToday.push(task);
      continue;
    }
    if (!task.dueDate) nodate.push(task);
    else if (task.dueDate < today) overdue.push(task);
    else if (task.dueDate === today) dueToday.push(task);
    else upcoming.push(task);
  }

  dueToday.sort(
    (a, b) => Number(Boolean(a.completedAt)) - Number(Boolean(b.completedAt)) || byCreated(a, b),
  );
  done.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return {
    overdue: overdue.sort(byDue),
    today: dueToday,
    upcoming: upcoming.sort(byDue),
    nodate: nodate.sort(byCreated),
    done,
    doneThisWeek,
  };
}

export function groupByDate(tasks: TaskRecord[]) {
  const groups: { date: string; tasks: TaskRecord[] }[] = [];
  for (const task of tasks) {
    const date = task.dueDate ?? "";
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.tasks.push(task);
    else groups.push({ date, tasks: [task] });
  }
  return groups;
}

export function nextWeekDate(today: string) {
  return addDays(today, 7);
}

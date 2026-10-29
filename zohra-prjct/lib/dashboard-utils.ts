import type { TaskRecord } from "@/lib/task-utils";
import { localDateString } from "@/lib/task-utils";

export type DashboardResource = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  textExtractionStatus: string;
  organizationStatus:
    | "PENDING"
    | "PROCESSING"
    | "ORGANIZED"
    | "NEEDS_REVIEW"
    | "FAILED";
  subject: { id: string; name: string } | null;
  createdAt: string;
};

export type ResourceKind =
  | "pdf"
  | "image"
  | "video"
  | "slides"
  | "document"
  | "text"
  | "file";

export function resourceKind(mimeType: string, name: string): ResourceKind {
  const mime = mimeType.toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.includes("presentation") || ["ppt", "pptx"].includes(ext))
    return "slides";
  if (mime.includes("word") || ["doc", "docx"].includes(ext)) return "document";
  if (mime.startsWith("text/") || ["txt", "md"].includes(ext)) return "text";
  return "file";
}

export type ResourceBadge = {
  label: string;
  tone: "info" | "warn" | "danger";
};

/** The one status worth interrupting a scan of the list for, if any. */
export function resourceBadge(resource: DashboardResource): ResourceBadge | null {
  if (resource.status === "FAILED" || resource.organizationStatus === "FAILED")
    return { label: "Failed", tone: "danger" };
  if (
    resource.status === "PROCESSING" ||
    resource.textExtractionStatus === "EXTRACTING" ||
    resource.organizationStatus === "PROCESSING"
  )
    return { label: "Processing", tone: "info" };
  if (resource.organizationStatus === "NEEDS_REVIEW")
    return { label: "Needs review", tone: "warn" };
  return null;
}

export function isProcessing(resource: DashboardResource) {
  return resourceBadge(resource)?.label === "Processing";
}

export function needsAttention(resource: DashboardResource) {
  const label = resourceBadge(resource)?.label;
  return label === "Needs review" || label === "Failed";
}

/** "Just now", "3 hours ago", "yesterday", then a plain date after a week. */
export function formatRelative(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.floor((now - then) / 60_000));
  if (minutes < 1) return "Just now";
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, "day");
  const date = new Date(then);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date(now).getFullYear() ? undefined : "numeric",
  }).format(date);
}

/** Parse a YYYY-MM-DD string as a local calendar date. */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value: string, amount: number): string {
  const date = parseDateOnly(value);
  date.setDate(date.getDate() + amount);
  return localDateString(date);
}

export function daysBetween(from: string, to: string): number {
  const a = parseDateOnly(from);
  const b = parseDateOnly(to);
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86_400_000,
  );
}

export function overdueLabel(dueDate: string, today: string): string {
  const days = daysBetween(dueDate, today);
  return days === 1 ? "Due yesterday" : `${days} days overdue`;
}

export type TaskGroups = {
  overdue: TaskRecord[];
  today: TaskRecord[];
  upcoming: TaskRecord[];
};

/**
 * Overdue tasks used to disappear from the dashboard because only
 * `dueDate === today` was shown. They now get their own group.
 */
export function groupTasks(tasks: TaskRecord[], today: string): TaskGroups {
  const weekEnd = addDays(today, 7);
  const overdue: TaskRecord[] = [];
  const todays: TaskRecord[] = [];
  const upcoming: TaskRecord[] = [];

  for (const task of tasks) {
    if (!task.dueDate) continue;
    if (task.dueDate === today) todays.push(task);
    else if (task.dueDate < today && !task.completedAt) overdue.push(task);
    else if (task.dueDate > today && task.dueDate <= weekEnd && !task.completedAt)
      upcoming.push(task);
  }

  const byDate = (a: TaskRecord, b: TaskRecord) =>
    (a.dueDate ?? "").localeCompare(b.dueDate ?? "");

  overdue.sort(byDate);
  upcoming.sort(byDate);
  // Open tasks first so finished ones sink instead of jumping around the list.
  todays.sort((a, b) => Number(Boolean(a.completedAt)) - Number(Boolean(b.completedAt)));

  return { overdue, today: todays, upcoming };
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

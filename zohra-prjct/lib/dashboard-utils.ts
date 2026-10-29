import type { TaskRecord } from "@/lib/task-utils";

/** The fields of /api/resources that the dashboard uses. */
export type DashboardResource = {
  id: string;
  originalName: string;
  mimeType: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  textExtractionStatus: "NOT_STARTED" | "EXTRACTING" | "EXTRACTED" | "NO_TEXT" | "FAILED" | "NOT_APPLICABLE";
  pageCount: number | null;
  organizationStatus: "PENDING" | "PROCESSING" | "ORGANIZED" | "NEEDS_REVIEW" | "FAILED";
  awaitingOrganizationInput: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ResourceTone = "ok" | "info" | "warn" | "error";

export type ResourceState = {
  label: string;
  tone: ResourceTone;
  /** Work is still running, so the dashboard keeps checking for updates. */
  busy: boolean;
  /** The student should look at this file. */
  attention: boolean;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function fileKind(mimeType: string): "pdf" | "text" | "image" | "video" | "other" {
  const type = mimeType.toLowerCase();
  if (type.includes("pdf")) return "pdf";
  if (type.startsWith("text/")) return "text";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  return "other";
}

/** Turns the many status fields of a file into one short label for the student. */
export function describeResource(resource: DashboardResource, nowMs: number): ResourceState {
  const age = nowMs - new Date(resource.createdAt).getTime();
  const idle = nowMs - new Date(resource.updatedAt).getTime();
  const kind = fileKind(resource.mimeType);

  if (resource.status === "FAILED") return { label: "Upload failed", tone: "error", busy: false, attention: true };
  if (resource.status === "PENDING") {
    return age > HOUR
      ? { label: "Upload incomplete", tone: "warn", busy: false, attention: true }
      : { label: "Uploading", tone: "info", busy: true, attention: false };
  }
  if (resource.status === "PROCESSING") return { label: "Processing", tone: "info", busy: true, attention: false };

  if (resource.textExtractionStatus === "EXTRACTING") {
    return idle > 5 * MINUTE
      ? { label: "Reading stalled", tone: "warn", busy: false, attention: true }
      : { label: "Reading text", tone: "info", busy: true, attention: false };
  }
  if (resource.textExtractionStatus === "NOT_STARTED" && (kind === "pdf" || kind === "text")) {
    return age > 10 * MINUTE
      ? { label: "Text not read", tone: "warn", busy: false, attention: true }
      : { label: "Reading text", tone: "info", busy: true, attention: false };
  }
  if (resource.textExtractionStatus === "FAILED") {
    return { label: "Couldn’t read text", tone: "error", busy: false, attention: true };
  }

  if (resource.organizationStatus === "FAILED") return { label: "Sorting failed", tone: "error", busy: false, attention: true };
  if (resource.organizationStatus === "NEEDS_REVIEW") return { label: "Check sorting", tone: "warn", busy: false, attention: true };
  if (resource.awaitingOrganizationInput) return { label: "Not sorted yet", tone: "warn", busy: false, attention: true };
  if (resource.organizationStatus === "PROCESSING" || resource.organizationStatus === "PENDING") {
    return idle > 3 * MINUTE
      ? { label: "Sorting stalled", tone: "warn", busy: false, attention: true }
      : { label: "Sorting", tone: "info", busy: true, attention: false };
  }

  if (resource.textExtractionStatus === "NO_TEXT") {
    return { label: "No readable text", tone: "warn", busy: false, attention: false };
  }
  return { label: "Ready", tone: "ok", busy: false, attention: false };
}

/** Can Zohra AI read this file? */
export function isReadyForAi(resource: DashboardResource) {
  return resource.status === "READY" && resource.textExtractionStatus === "EXTRACTED";
}

export function relativeTime(iso: string, nowMs: number) {
  const then = new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor((nowMs - then) / MINUTE));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  const date = new Date(then);
  const sameYear = date.getFullYear() === new Date(nowMs).getFullYear();
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }).format(date);
}

export function greetingFor(hour: number) {
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** Adds days to a YYYY-MM-DD string without any time zone surprises. */
export function addDays(dateOnly: string, days: number) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Splits tasks into what is late, what is due today and what is coming this week. */
export function groupTasks(tasks: TaskRecord[], today: string, upcomingDays = 7) {
  const byDate = (a: TaskRecord, b: TaskRecord) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
  const horizon = addDays(today, upcomingDays);
  const open = tasks.filter((task) => !task.completedAt);

  return {
    overdue: open.filter((task) => task.dueDate && task.dueDate < today).sort(byDate),
    // Completed tasks stay visible today, below the open ones, so ticking one off feels finished.
    today: tasks
      .filter((task) => task.dueDate === today)
      .sort((a, b) => Number(Boolean(a.completedAt)) - Number(Boolean(b.completedAt))),
    upcoming: open.filter((task) => task.dueDate && task.dueDate > today && task.dueDate <= horizon).sort(byDate),
  };
}

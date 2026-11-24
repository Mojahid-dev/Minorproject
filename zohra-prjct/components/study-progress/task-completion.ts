import { notifyTasksChanged } from "@/lib/task-utils";
import type { StudySession } from "./study-tracker-provider";

const PROMPTED_KEY = "zohra:task-prompted";

function promptedIds(): string[] {
  try {
    const raw = window.localStorage.getItem(PROMPTED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Remember that we already asked about this session, so a reload doesn't ask twice. */
export function markTaskPrompted(sessionId: string) {
  try {
    window.localStorage.setItem(PROMPTED_KEY, JSON.stringify([sessionId, ...promptedIds().filter((id) => id !== sessionId)].slice(0, 40)));
  } catch {
    /* Private mode: worst case we ask again. */
  }
}

/**
 * Ask "is this task finished?" after any ended session that was linked to a task that is still open.
 * Only very short sessions (accidental starts) and sessions we already asked about are skipped.
 */
export function shouldAskAboutTask(session: StudySession | null | undefined): session is StudySession & { task: NonNullable<StudySession["task"]> } {
  if (!session?.task || (session.status !== "COMPLETED" && session.status !== "ABANDONED")) return false;
  if (session.task.completedAt) return false;
  if ((session.durationSeconds ?? session.accumulatedSeconds ?? 0) < 60) return false;
  return typeof window === "undefined" || !promptedIds().includes(session.id);
}

/** Marks a task done (or reopens it) and tells every task view to refresh. */
export async function setTaskCompleted(taskId: string, completed: boolean): Promise<boolean> {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (!response.ok) return false;
    notifyTasksChanged();
    return true;
  } catch {
    return false;
  }
}

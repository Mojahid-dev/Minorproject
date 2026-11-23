import { notifyTasksChanged } from "@/lib/task-utils";
import type { StudySession } from "./study-tracker-provider";

/** A session can only say "this task might be done" when it ended on purpose, lasted a real while, and the task is still open. */
export function shouldAskAboutTask(session: StudySession | null | undefined): session is StudySession & { task: NonNullable<StudySession["task"]> } {
  if (!session?.task || session.status !== "COMPLETED") return false;
  if (session.task.completedAt) return false;
  if (session.endReason !== "DONE_EARLY" && session.endReason !== "TIMER_COMPLETED") return false;
  return (session.durationSeconds ?? session.accumulatedSeconds ?? 0) >= 60;
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

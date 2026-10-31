"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo } from "react";
import { BadgeCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useTasks } from "@/hooks/use-tasks";
import { useJson } from "@/hooks/use-json";
import { useClock } from "@/hooks/use-clock";
import { localDateString, notifyTasksChanged, type TaskRecord } from "@/lib/task-utils";
import {
  groupTasks,
  isProcessing,
  needsAttention,
  plural,
  type DashboardResource,
} from "@/lib/dashboard-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { primaryButton } from "@/components/dashboard/shared";
import { TodayPanel } from "@/components/dashboard/today-panel";
import { WeekStrip } from "@/components/dashboard/week-strip";
import { LibraryPanel } from "@/components/dashboard/library-panel";
import {
  AskZohraCard,
  type ConversationSummary,
} from "@/components/dashboard/ask-zohra-card";
import {
  OnboardingChecklist,
  type OnboardingStep,
} from "@/components/dashboard/onboarding-checklist";

// Module-level selectors keep useJson's request identity stable.
const selectResources = (payload: unknown): DashboardResource[] => {
  const list = (payload as { resources?: unknown } | null)?.resources;
  return Array.isArray(list) ? (list as DashboardResource[]) : [];
};
const selectConversations = (payload: unknown): ConversationSummary[] => {
  const list = (payload as { conversations?: unknown } | null)?.conversations;
  return Array.isArray(list) ? (list as ConversationSummary[]) : [];
};
const selectRecognized = (payload: unknown): boolean =>
  (payload as { request?: { status?: string } | null } | null)?.request?.status ===
  "APPROVED";

const EMPTY_RESOURCES: DashboardResource[] = [];
const EMPTY_CONVERSATIONS: ConversationSummary[] = [];

export default function DashboardPage() {
  const { data: session } = useSession();
  const now = useClock();

  const {
    tasks,
    setTasks,
    refresh: refreshTasks,
    isLoading: tasksLoading,
    error: taskError,
  } = useTasks();
  const resourcesState = useJson("/api/resources", selectResources, EMPTY_RESOURCES, "Unable to load your files.");
  const chatsState = useJson("/api/ai/conversations", selectConversations, EMPTY_CONVERSATIONS);
  const recognizedState = useJson("/api/recognition-request", selectRecognized, false);

  const resources = resourcesState.data;
  const conversations = chatsState.data;
  const isRecognized = recognizedState.data;

  const today = now ? localDateString(new Date(now)) : null;
  const clock = now ? new Date(now) : null;

  // Keep in sync when the sidebar (or another tab of the app) changes tasks.
  useEffect(() => {
    const onChanged = () => void refreshTasks();
    window.addEventListener("zohra:tasks-updated", onChanged);
    return () => window.removeEventListener("zohra:tasks-updated", onChanged);
  }, [refreshTasks]);

  const groups = useMemo(
    () => (today ? groupTasks(tasks, today) : { overdue: [], today: [], upcoming: [] }),
    [tasks, today],
  );

  const toggleTask = useCallback(
    async (task: TaskRecord) => {
      const completing = !task.completedAt;
      const apply = (completedAt: string | null) =>
        setTasks((current) =>
          current.map((item) => (item.id === task.id ? { ...item, completedAt } : item)),
        );

      apply(completing ? new Date().toISOString() : null); // optimistic
      try {
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: completing }),
        });
        if (!response.ok) throw new Error();
        notifyTasksChanged();
      } catch {
        apply(task.completedAt); // roll back
        toast.error("Couldn't update that task. Please try again.");
      }
    },
    [setTasks],
  );

  const addTask = useCallback(
    async (title: string) => {
      if (!today) return;
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dueDate: today }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const created = (payload as { task?: TaskRecord } | null)?.task;
      if (!response.ok || !created) {
        const message = (payload as { error?: string } | null)?.error;
        throw new Error(message || "Unable to add task.");
      }
      setTasks((current) => [...current, created]);
      notifyTasksChanged();
    },
    [setTasks, today],
  );

  // ---- header copy -------------------------------------------------------
  const userName = session?.user?.name?.trim().split(/\s+/)[0] || "there";
  const hour = clock?.getHours() ?? 12;
  const greeting =
    !clock ? "Welcome back" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = clock
    ? new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(clock)
    : "";

  const openToday = groups.today.filter((task) => !task.completedAt).length;
  const processing = resources.filter(isProcessing).length;
  const attention = resources.filter(needsAttention).length;
  const summaryReady = Boolean(today) && !tasksLoading && !resourcesState.isLoading;

  const summaryParts = [
    groups.overdue.length > 0 ? `${groups.overdue.length} overdue` : null,
    openToday > 0 ? `${plural(openToday, "task")} left today` : null,
    processing > 0 ? `${plural(processing, "file")} processing` : null,
    attention > 0 ? `${attention} to review` : null,
  ].filter(Boolean);

  const summary = taskError
    ? ""
    : summaryParts.length
      ? summaryParts.join(" · ")
      : groups.today.length > 0
        ? "Today's plan is complete."
        : "Nothing urgent right now.";

  // ---- onboarding --------------------------------------------------------
  const loadedAll =
    !tasksLoading &&
    !resourcesState.isLoading &&
    !chatsState.isLoading &&
    !taskError &&
    !resourcesState.error &&
    !chatsState.error;

  const steps: OnboardingStep[] = [
    {
      id: "upload",
      title: "Upload a resource",
      hint: "Notes, slides or a PDF",
      href: "/upload",
      done: resources.length > 0,
    },
    {
      id: "task",
      title: "Plan a task",
      hint: "Pick one thing for today",
      href: today ? `/tasks?date=${today}` : "/tasks",
      done: tasks.length > 0,
    },
    {
      id: "ai",
      title: "Ask Zohra AI",
      hint: "Try a question about a topic",
      href: "/zohra-ai",
      done: conversations.length > 0,
    },
  ];
  const showOnboarding = loadedAll && steps.some((step) => !step.done);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-5 pb-8 sm:space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-h-6 flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">{dateLabel}</p>
            {isRecognized && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                <BadgeCheck size={14} aria-hidden="true" /> Zohra Recognized
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {greeting}, {userName}
          </h1>
          <div className="mt-1.5 min-h-5 text-sm text-muted-foreground" aria-live="polite">
            {summaryReady ? (
              summary
            ) : (
              <Skeleton className="h-4 w-56 rounded-md" aria-hidden="true" />
            )}
          </div>
        </div>
        <Link href="/upload" className={`${primaryButton} w-full sm:w-auto`}>
          <UploadCloud size={18} aria-hidden="true" /> Upload resource
        </Link>
      </header>

      {showOnboarding && <OnboardingChecklist steps={steps} />}

      {/* Mobile: a single column, today's plan first. Desktop: 2/3 + 1/3. */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <TodayPanel
            groups={groups}
            today={today}
            loading={tasksLoading}
            error={taskError}
            onRetry={() => void refreshTasks()}
            onToggle={toggleTask}
            onAdd={addTask}
          />
          <LibraryPanel
            resources={resources}
            loading={resourcesState.isLoading}
            error={resourcesState.error}
            now={now}
            onRetry={resourcesState.retry}
          />
        </div>

        <div className="min-w-0 space-y-5 sm:space-y-6">
          <AskZohraCard last={conversations[0]} />
          <WeekStrip
            tasks={tasks}
            upcoming={groups.upcoming}
            today={today}
            loading={tasksLoading}
          />
        </div>
      </div>
    </div>
  );
}

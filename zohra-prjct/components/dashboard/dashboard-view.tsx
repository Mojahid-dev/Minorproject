"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Sparkles,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/hooks/use-tasks";
import { formatTaskDate, localDateString, notifyTasksChanged, type TaskRecord } from "@/lib/task-utils";
import {
  describeResource,
  fileKind,
  greetingFor,
  groupTasks,
  isReadyForAi,
  relativeTime,
  type DashboardResource,
  type ResourceTone,
} from "@/lib/dashboard-utils";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";
const PANEL = "rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#151619] to-[#101114]";
const CHECKLIST_KEY = "zohra:dashboard-checklist-dismissed";
const MAX_TASK_ROWS = 6;
const POLL_MS = 5_000;
const MAX_POLLS = 60;

const toneClasses: Record<ResourceTone, string> = {
  ok: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  info: "border-sky-300/20 bg-sky-300/10 text-sky-200",
  warn: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  error: "border-red-300/25 bg-red-300/10 text-red-200",
};

const accentClasses = {
  default: "text-white",
  danger: "text-red-200",
  warn: "text-amber-200",
  ok: "text-emerald-200",
} as const;

function chatHref(question: string, resourceId?: string) {
  const params = new URLSearchParams();
  if (resourceId) params.set("resource", resourceId);
  params.set("q", question);
  return `/zohra-ai?${params.toString()}`;
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  const kind = fileKind(mimeType);
  const Icon = kind === "image" ? ImageIcon : kind === "video" ? Video : kind === "pdf" || kind === "text" ? FileText : FileIcon;
  return <Icon size={18} aria-hidden="true" />;
}

type Props = { firstName: string; isRecognized: boolean };

export function DashboardView({ firstName, isRecognized }: Props) {
  const router = useRouter();
  const { tasks, setTasks, isLoading: tasksLoading, error: taskError } = useTasks();

  // Anything that depends on the clock starts empty so the server and browser render the same HTML.
  const [now, setNow] = useState<Date | null>(null);
  const [resources, setResources] = useState<DashboardResource[] | null>(null);
  const [resourceError, setResourceError] = useState("");
  const [chatCount, setChatCount] = useState<number | null>(null);
  const [checklistDismissed, setChecklistDismissed] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [busyTaskIds, setBusyTaskIds] = useState<string[]>([]);
  const [taskNotice, setTaskNotice] = useState("");
  const pollsRef = useRef(0);

  const loadResources = useCallback(async () => {
    try {
      const response = await fetch("/api/resources", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load your files.");
      setResources(Array.isArray(payload.resources) ? (payload.resources as DashboardResource[]) : []);
      setResourceError("");
    } catch (caught) {
      setResourceError(caught instanceof Error ? caught.message : "Unable to load your files.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNow(new Date());
      try {
        setChecklistDismissed(window.localStorage.getItem(CHECKLIST_KEY) === "1");
      } catch {
        setChecklistDismissed(false);
      }
      void loadResources();
      fetch("/api/ai/conversations", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return;
          const payload = await response.json();
          if (Array.isArray(payload.conversations)) setChatCount(payload.conversations.length);
        })
        .catch(() => undefined);
    }, 0);
    const tick = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(tick);
    };
  }, [loadResources]);

  const nowMs = now?.getTime() ?? 0;

  const states = useMemo(
    () => (resources && now ? resources.map((resource) => ({ resource, state: describeResource(resource, nowMs) })) : []),
    [resources, now, nowMs],
  );
  const hasBusy = states.some(({ state }) => state.busy);

  // While files are still being processed, check again every few seconds (for about five minutes).
  useEffect(() => {
    if (!hasBusy) {
      pollsRef.current = 0;
      return;
    }
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      pollsRef.current += 1;
      if (pollsRef.current > MAX_POLLS) {
        window.clearInterval(timer);
        return;
      }
      void loadResources();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [hasBusy, loadResources]);

  const attention = states.filter(({ state }) => state.attention);
  const busyCount = states.filter(({ state }) => state.busy).length;
  const readyForAi = resources?.filter(isReadyForAi) ?? [];
  const recent = states.slice(0, 5);
  const newestReadable = readyForAi[0];

  const today = now ? localDateString(now) : null;
  const groups = useMemo(() => (today ? groupTasks(tasks, today) : null), [tasks, today]);
  const openToday = groups ? groups.today.filter((task) => !task.completedAt).length : 0;

  const taskRows = groups
    ? [
        ...groups.overdue.map((task) => ({ group: "Overdue", task })),
        ...groups.today.map((task) => ({ group: "Today", task })),
        ...groups.upcoming.map((task) => ({ group: "Next 7 days", task })),
      ]
    : [];
  const visibleTaskRows = taskRows.slice(0, MAX_TASK_ROWS);
  const hiddenTaskCount = taskRows.length - visibleTaskRows.length;

  const dateLabel = now
    ? new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now)
    : "";
  const greeting = now ? greetingFor(now.getHours()) : "Welcome back";

  async function toggleTask(task: TaskRecord) {
    const completed = !task.completedAt;
    setTaskNotice("");
    setBusyTaskIds((ids) => [...ids, task.id]);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Unable to update the task.");
      }
      setTasks((items) =>
        items.map((item) => (item.id === task.id ? { ...item, completedAt: completed ? new Date().toISOString() : null } : item)),
      );
      notifyTasksChanged();
    } catch (caught) {
      setTaskNotice(caught instanceof Error ? caught.message : "Unable to update the task.");
    } finally {
      setBusyTaskIds((ids) => ids.filter((id) => id !== task.id));
    }
  }

  function askZohra() {
    const question = prompt.trim();
    if (question) router.push(chatHref(question));
  }

  function dismissChecklist() {
    setChecklistDismissed(true);
    try {
      window.localStorage.setItem(CHECKLIST_KEY, "1");
    } catch {
      /* The checklist will simply come back on the next visit. */
    }
  }

  // ---- stat cards ----
  type Stat = {
    key: string;
    eyebrow: string;
    title: string;
    detail: string;
    href: string;
    accent: keyof typeof accentClasses;
    loading: boolean;
  };

  const taskStat: Stat = ((): Stat => {
    const base = { key: "tasks", eyebrow: "Tasks", href: "/tasks" };
    if (tasksLoading || !groups) return { ...base, title: "", detail: "", accent: "default", loading: true };
    if (taskError) return { ...base, title: "Tasks unavailable", detail: "Open Tasks to try again", accent: "warn", loading: false };
    if (groups.overdue.length > 0) {
      return {
        ...base,
        title: `${groups.overdue.length} overdue`,
        detail: openToday > 0 ? `${openToday} more due today` : "Nothing else due today",
        accent: "danger",
        loading: false,
      };
    }
    if (openToday > 0) {
      return {
        ...base,
        title: `${openToday} due today`,
        detail: groups.upcoming.length ? `${groups.upcoming.length} more this week` : "Nothing overdue",
        accent: "default",
        loading: false,
      };
    }
    return {
      ...base,
      title: "All caught up",
      detail: groups.upcoming.length ? `${groups.upcoming.length} coming up this week` : "No tasks due soon",
      accent: "ok",
      loading: false,
    };
  })();

  const fileStat: Stat = ((): Stat => {
    const base = { key: "attention", eyebrow: "Files" };
    if (resources === null) {
      return resourceError
        ? { ...base, title: "Files unavailable", detail: "Check your connection", href: "/resources", accent: "warn", loading: false }
        : { ...base, title: "", detail: "", href: "/resources", accent: "default", loading: true };
    }
    if (attention.length > 0) {
      return {
        ...base,
        title: `${attention.length} need${attention.length === 1 ? "s" : ""} attention`,
        detail: busyCount > 0 ? `${busyCount} still processing` : "Open them to fix the issue",
        href: attention.length === 1 ? `/resources/${attention[0].resource.id}` : "/resources",
        accent: "warn",
        loading: false,
      };
    }
    if (busyCount > 0) {
      return { ...base, title: `${busyCount} processing`, detail: "This updates by itself", href: "/resources", accent: "default", loading: false };
    }
    if (resources.length === 0) {
      return { ...base, title: "No files yet", detail: "Upload your first PDF", href: "/upload", accent: "default", loading: false };
    }
    return { ...base, title: "All files are ready", detail: "Nothing needs fixing", href: "/resources", accent: "ok", loading: false };
  })();

  const libraryStat: Stat = ((): Stat => {
    const base = { key: "library", eyebrow: "Library" };
    if (resources === null) {
      return resourceError
        ? { ...base, title: "Library unavailable", detail: "Check your connection", href: "/resources", accent: "warn", loading: false }
        : { ...base, title: "", detail: "", href: "/resources", accent: "default", loading: true };
    }
    if (resources.length === 0) {
      return { ...base, title: "Library is empty", detail: "Add files to get started", href: "/upload", accent: "default", loading: false };
    }
    return {
      ...base,
      title: `${resources.length} file${resources.length === 1 ? "" : "s"}`,
      detail: `${readyForAi.length} ready for Zohra AI`,
      href: "/resources",
      accent: "default",
      loading: false,
    };
  })();

  // ---- first-time checklist ----
  const checklist = [
    { label: "Upload your first file", href: "/upload", done: resources === null ? null : resources.length > 0 },
    { label: "Let Zohra read it", href: "/resources", done: resources === null ? null : resources.some((r) => r.textExtractionStatus === "EXTRACTED") },
    { label: "Chat with Zohra AI", href: "/zohra-ai", done: chatCount === null ? null : chatCount > 0 },
    { label: "Add your first task", href: "/tasks", done: tasksLoading || taskError ? null : tasks.length > 0 },
  ];
  const checklistKnown = checklist.every((step) => step.done !== null);
  const checklistDone = checklist.filter((step) => step.done).length;
  const showChecklist = !checklistDismissed && checklistKnown && checklistDone < checklist.length;

  const suggestions = [
    ...(newestReadable
      ? [{ label: `Summarize “${newestReadable.originalName.length > 28 ? `${newestReadable.originalName.slice(0, 28)}…` : newestReadable.originalName}”`, href: chatHref("Summarize this file", newestReadable.id) }]
      : []),
    { label: "Explain a topic simply", href: chatHref("Explain a topic to me simply: ") },
    { label: "Plan my study week", href: chatHref("Help me plan my study week.") },
    { label: "Give me memory tips", href: chatHref("Give me 5 practical tips to remember what I study.") },
  ];

  return (
    <div className="mx-auto max-w-[1440px] pb-8 text-white">
      {/* Header */}
      <header className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 min-h-5 text-sm font-medium text-neutral-300">{dateLabel}</p>
          <h1 className="text-3xl font-bold tracking-[-0.045em] sm:text-[30px]">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          {isRecognized && (
            <p
              title="Zohra Recognized means a Zohra reviewer has approved your account."
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-violet-200/25 bg-violet-200/10 px-2.5 py-1 text-xs font-semibold text-violet-100"
            >
              <BadgeCheck size={15} aria-hidden="true" />
              Zohra Recognized
            </p>
          )}
        </div>
        <Link
          href="/upload"
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 ${FOCUS}`}
        >
          <UploadCloud size={17} aria-hidden="true" /> Upload files
        </Link>
      </header>

      {/* Ask Zohra */}
      <section aria-label="Ask Zohra AI" className={`${PANEL} mt-5 p-4 sm:p-5`}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            askZohra();
          }}
          className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] p-1.5 pl-4 transition focus-within:border-white/40"
        >
          <Sparkles size={18} className="shrink-0 text-violet-200" aria-hidden="true" />
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={1000}
            placeholder="Ask Zohra anything about your studies…"
            aria-label="Ask Zohra AI"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-400"
          />
          <button
            type="submit"
            disabled={!prompt.trim()}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
          >
            Ask <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Link
              key={suggestion.label}
              href={suggestion.href}
              className={`inline-flex min-h-10 items-center rounded-full border border-white/12 px-3.5 text-xs font-medium text-neutral-200 transition hover:border-white/30 hover:bg-white/[0.05] ${FOCUS}`}
            >
              {suggestion.label}
            </Link>
          ))}
        </div>
      </section>

      {/* First-time checklist */}
      {showChecklist && (
        <section aria-labelledby="checklist-title" className={`${PANEL} mt-4 p-4 sm:p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="checklist-title" className="text-base font-semibold">Get started with Zohra</h2>
              <p className="mt-0.5 text-xs text-neutral-300">{checklistDone} of {checklist.length} done</p>
            </div>
            <button
              type="button"
              onClick={dismissChecklist}
              aria-label="Hide the getting started checklist"
              className={`grid size-10 shrink-0 place-items-center rounded-lg text-neutral-300 transition hover:bg-white/[0.07] hover:text-white ${FOCUS}`}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={checklist.length} aria-valuenow={checklistDone} aria-label="Getting started progress">
            <div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${(checklistDone / checklist.length) * 100}%` }} />
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {checklist.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className={`flex min-h-11 items-center gap-2.5 rounded-xl border border-white/[0.07] px-3 text-sm transition hover:bg-white/[0.05] ${step.done ? "text-neutral-300" : "text-white"} ${FOCUS}`}
                >
                  {step.done ? (
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-300" aria-hidden="true" />
                  ) : (
                    <span className="size-[18px] shrink-0 rounded-full border border-neutral-400" aria-hidden="true" />
                  )}
                  <span className={step.done ? "line-through decoration-neutral-500" : ""}>{step.label}</span>
                  <span className="sr-only">{step.done ? " (done)" : " (not done yet)"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Stat cards */}
      <section aria-label="Summary" className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {[taskStat, fileStat, libraryStat].map((stat) => (
          <Link
            key={stat.key}
            href={stat.href}
            className={`group relative flex min-h-[112px] flex-col justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#242529] to-[#17181b] p-4 transition hover:border-white/20 ${FOCUS}`}
          >
            <p className="text-sm text-neutral-300">{stat.eyebrow}</p>
            {stat.loading ? (
              <div className="mt-3 space-y-2" aria-label={`Loading ${stat.eyebrow.toLowerCase()}`}>
                <Skeleton className="h-6 w-2/3 rounded-lg bg-white/[0.08]" />
                <Skeleton className="h-4 w-1/2 rounded-lg bg-white/[0.06]" />
              </div>
            ) : (
              <div className="mt-3 min-w-0 pr-10">
                <p className={`truncate text-xl font-semibold tracking-[-0.025em] ${accentClasses[stat.accent]}`}>{stat.title}</p>
                <p className="mt-0.5 truncate text-sm text-neutral-300">{stat.detail}</p>
              </div>
            )}
            <span className="absolute bottom-4 right-4 grid size-8 place-items-center rounded-full bg-white/10 text-neutral-100 transition group-hover:bg-white/20">
              <ArrowRight size={16} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>

      {/* Files + tasks */}
      <div className="mt-4 grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <section aria-labelledby="recent-title" className={`${PANEL} p-4 sm:p-5`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <Clock3 size={17} aria-hidden="true" /> Recently added
              </div>
              <h2 id="recent-title" className="mt-1.5 text-lg font-semibold tracking-[-0.03em] sm:text-xl">Your files</h2>
            </div>
            <Link
              href="/resources"
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-white/[0.08] px-3 text-xs font-semibold text-neutral-100 transition hover:bg-white/[0.14] ${FOCUS}`}
            >
              View all <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-3 space-y-1.5" aria-live="polite">
            {resources === null && !resourceError ? (
              <div className="space-y-2 py-1" aria-label="Loading files">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-[58px] rounded-xl bg-white/[0.05]" />
                ))}
              </div>
            ) : resources === null ? (
              <div role="alert" className="rounded-xl border border-red-300/20 bg-red-300/[0.06] px-3 py-4 text-sm text-red-100">
                <p>{resourceError}</p>
                <button type="button" onClick={() => void loadResources()} className={`mt-2 inline-flex min-h-10 items-center rounded-lg px-1 font-semibold underline underline-offset-2 ${FOCUS}`}>
                  Try again
                </button>
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-white/15 px-4 py-6">
                <span className="grid size-10 place-items-center rounded-xl bg-white/[0.07] text-neutral-200">
                  <UploadCloud size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Add your first file</p>
                  <p className="mt-1 text-sm leading-6 text-neutral-300">Upload a PDF or your notes. Zohra will read and sort them so you can ask questions about them.</p>
                </div>
                <Link href="/upload" className={`inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold text-black transition hover:bg-neutral-200 ${FOCUS}`}>
                  <UploadCloud size={16} aria-hidden="true" /> Upload a file
                </Link>
              </div>
            ) : (
              recent.map(({ resource, state }) => (
                <Link
                  key={resource.id}
                  href={`/resources/${resource.id}`}
                  className={`group flex min-h-[58px] items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-2 transition hover:bg-white/[0.05] ${FOCUS}`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#34363b] to-[#24262a] text-neutral-100">
                    <FileTypeIcon mimeType={resource.mimeType} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-100">{resource.originalName}</span>
                    <span className="mt-0.5 block text-xs text-neutral-300">
                      {relativeTime(resource.createdAt, nowMs)}
                      {resource.pageCount ? ` · ${resource.pageCount} page${resource.pageCount === 1 ? "" : "s"}` : ""}
                    </span>
                  </span>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[state.tone]}`}>
                    {state.busy && <LoaderCircle size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                    {state.label}
                  </span>
                  <ArrowRight size={15} className="hidden shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-white sm:block" aria-hidden="true" />
                </Link>
              ))
            )}
          </div>
        </section>

        <section aria-labelledby="plan-title" className={`${PANEL} p-4 sm:p-5`}>
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
            <CalendarDays size={17} aria-hidden="true" /> Your plan
          </div>
          <h2 id="plan-title" className="mt-1.5 text-xl font-semibold">Tasks</h2>

          <div className="mt-3" aria-live="polite">
            {tasksLoading || !groups ? (
              <div className="space-y-2" aria-label="Loading tasks">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-11 rounded-lg bg-white/[0.05]" />
                ))}
              </div>
            ) : taskError ? (
              <p role="alert" className="text-sm text-red-200">{taskError}</p>
            ) : visibleTaskRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 px-4 py-5">
                <p className="text-sm font-semibold">Nothing due soon</p>
                <p className="mt-1 text-sm leading-6 text-neutral-300">Add a task with a date and it will show up here when it matters.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {visibleTaskRows.map(({ group, task }, index) => {
                  const completed = Boolean(task.completedAt);
                  const busy = busyTaskIds.includes(task.id);
                  const showHeading = index === 0 || visibleTaskRows[index - 1].group !== group;
                  return (
                    <li key={task.id}>
                      {showHeading && (
                        <p className={`px-1 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] ${group === "Overdue" ? "text-red-200" : "text-neutral-300"}`}>{group}</p>
                      )}
                      <div className="flex items-center gap-1 rounded-lg bg-white/[0.035] pr-3">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={completed}
                          aria-label={`${completed ? "Reopen" : "Complete"} ${task.title}`}
                          disabled={busy}
                          onClick={() => void toggleTask(task)}
                          className={`grid size-11 shrink-0 place-items-center rounded-lg disabled:opacity-50 ${FOCUS}`}
                        >
                          <span className={`grid size-5 place-items-center rounded-full border transition ${completed ? "border-emerald-300 bg-emerald-300 text-black" : "border-neutral-300"}`}>
                            {completed && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                          </span>
                        </button>
                        <span className={`min-w-0 flex-1 truncate text-sm ${completed ? "text-neutral-400 line-through" : "text-neutral-100"}`}>{task.title}</span>
                        {task.dueDate && group !== "Today" && (
                          <span className={`shrink-0 text-xs ${group === "Overdue" ? "text-red-200" : "text-neutral-300"}`}>{formatTaskDate(task.dueDate)}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {taskNotice && <p role="alert" className="mt-2 text-xs text-red-200">{taskNotice}</p>}
            {hiddenTaskCount > 0 && <p className="mt-2 text-xs text-neutral-300">+ {hiddenTaskCount} more in Tasks</p>}
          </div>

          <Link
            href="/tasks"
            className={`mt-4 flex min-h-11 items-center justify-between rounded-xl bg-white/[0.08] px-3.5 text-sm font-medium text-neutral-100 transition hover:bg-white/[0.14] ${FOCUS}`}
          >
            Open tasks <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/calendar"
            className={`mt-2 flex min-h-10 items-center justify-between rounded-xl px-3.5 text-xs text-neutral-300 transition hover:bg-white/[0.05] hover:text-white ${FOCUS}`}
          >
            Plan your calendar <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}

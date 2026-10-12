"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, Compass, FileText, Folder, Plus, UploadCloud } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useTasks } from "@/hooks/use-tasks";
import { localDateString } from "@/lib/task-utils";

type Resource = { id: string; originalName: string; mimeType: string; createdAt: string };

function formatRecent(date: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 3_600_000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { tasks, isLoading: tasksLoading, error: taskError } = useTasks();
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourceError, setResourceError] = useState("");
  const today = localDateString();
  const todaysTasks = useMemo(() => tasks.filter((task) => task.dueDate === today), [tasks, today]);
  const openToday = todaysTasks.filter((task) => !task.completedAt).length;
  const userName = session?.user?.name?.trim().split(/\s+/)[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  useEffect(() => {
    let active = true;
    fetch("/api/resources", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load resources.");
        if (active && Array.isArray(payload.resources)) setResources(payload.resources.slice(0, 5));
      })
      .catch((caught) => { if (active) setResourceError(caught instanceof Error ? caught.message : "Unable to load resources."); })
      .finally(() => { if (active) setResourcesLoading(false); });
    return () => { active = false; };
  }, []);

  const cards = [
    { icon: CheckCircle2, eyebrow: "Your focus today", title: tasksLoading ? "Loading tasks…" : taskError ? "Tasks unavailable" : openToday === 0 ? "You’re all caught up" : `${openToday} task${openToday === 1 ? "" : "s"} due today`, href: `/tasks?date=${today}`, tone: "light" },
    { icon: BookOpen, eyebrow: "Recently added", title: resourcesLoading ? "Loading resources…" : resources[0]?.originalName ?? "Add your first resource", href: resources[0] ? "/resources" : "/upload", tone: "dark" },
    { icon: Plus, eyebrow: "Turn ideas into progress", title: "Add learning materials", href: "/upload", tone: "light" },
  ];

  return (
    <div className="mx-auto max-w-[1440px] pb-8 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-sm font-medium text-neutral-400">{todayLabel}</p><h1 className="text-3xl font-bold tracking-[-0.045em] sm:text-[30px]">{greeting}, {userName} <span aria-hidden="true" className="text-neutral-300">✦</span></h1><p className="mt-2 text-sm text-neutral-300">Here&apos;s a focused view of what needs your attention today.</p></div>
        <Link href="/resources" className="flex items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-white/25 hover:bg-white/[0.06]"><Compass size={17} /> Explore workspace</Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ icon: Icon, eyebrow, title, href, tone }) => <Link key={eyebrow} href={href} className="group relative isolate flex min-h-[132px] overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#242529] to-[#17181b] p-5 transition hover:border-white/20 hover:from-[#2a2b30]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-4 -top-9 size-36 rotate-45 rounded-[28px] border border-white/[0.07] bg-gradient-to-br from-white/[0.08] to-transparent" />
          <div className="relative z-10 flex w-full min-w-0 flex-col items-start"><span className={`grid size-9 place-items-center rounded-lg shadow-inner ${tone === "light" ? "bg-gradient-to-br from-white to-neutral-300 text-zinc-900" : "border border-white/10 bg-white/[0.08] text-white"}`}><Icon size={20} /></span><p className="mt-4 text-sm text-neutral-300">{eyebrow}</p><p className="mt-0.5 max-w-full truncate text-lg font-semibold tracking-[-0.025em] text-white">{title}</p></div>
          <span className="absolute bottom-4 right-4 grid size-8 place-items-center rounded-full bg-white/10 text-neutral-100 transition group-hover:bg-white/20"><ArrowRight size={17} /></span>
        </Link>)}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.5fr)]">
        <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#151619] to-[#101114] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-medium text-neutral-300"><Clock3 size={17} /> Recently added</div><h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white">Your resource library</h2></div><Link href="/resources" className="inline-flex items-center gap-2 rounded-xl bg-white/[0.08] px-3.5 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-white/[0.14]">View all <ArrowRight size={15} /></Link></div>
          <div className="mt-3 space-y-1">
            {resourcesLoading ? <div className="space-y-2 py-2" aria-label="Loading resources"><div className="h-12 animate-pulse rounded-xl bg-white/[0.04]" /><div className="h-12 animate-pulse rounded-xl bg-white/[0.04]" /></div>
              : resourceError ? <div className="rounded-xl border border-white/[0.06] px-3 py-5 text-sm text-red-200" role="alert">{resourceError}</div>
                : resources.length ? resources.map((resource) => {
                  const Icon = resource.mimeType.includes("pdf") || resource.mimeType.includes("text") ? FileText : Folder;
                  return <Link href="/resources" key={resource.id} className="group flex min-h-[54px] items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 transition hover:bg-white/[0.05]"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#34363b] to-[#24262a] text-neutral-100"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-neutral-100">{resource.originalName}</span><span className="mt-0.5 block text-xs text-neutral-400">Added {formatRecent(resource.createdAt)}</span></span><span className="hidden text-xs text-neutral-400 sm:block">{formatRecent(resource.createdAt)}</span><ArrowRight size={15} className="text-neutral-500 transition group-hover:translate-x-0.5 group-hover:text-white" /></Link>;
                }) : <div className="flex min-h-[76px] items-center gap-3 rounded-xl border border-white/[0.06] px-3 text-sm text-neutral-300"><span className="grid size-9 place-items-center rounded-lg bg-white/[0.06] text-neutral-300"><Folder size={18} /></span><span className="flex-1">Your recent resources will appear here.</span><Link href="/upload" className="inline-flex items-center gap-1.5 text-white hover:text-neutral-200"><UploadCloud size={15} /> Add resources</Link></div>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#151619] to-[#101114] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-300"><CalendarDays size={17} /> Today</div><h2 className="mt-1.5 text-xl font-semibold">Your plan</h2>
          {tasksLoading ? <p className="mt-4 text-sm text-neutral-400">Loading tasks…</p> : taskError ? <p role="alert" className="mt-4 text-sm text-red-200">{taskError}</p> : todaysTasks.length ? <div className="mt-3 space-y-2">{todaysTasks.slice(0, 3).map((task) => <div key={task.id} className="flex items-center gap-2 rounded-lg bg-white/[0.035] px-3 py-2.5"><span className={`size-2 shrink-0 rounded-full ${task.completedAt ? "bg-emerald-300" : "bg-neutral-400"}`} /><span className={`min-w-0 flex-1 truncate text-sm ${task.completedAt ? "text-neutral-500 line-through" : "text-neutral-200"}`}>{task.title}</span></div>)}<p className="text-xs text-neutral-400">{todaysTasks.filter((task) => task.completedAt).length} of {todaysTasks.length} complete</p></div> : <p className="mt-4 text-sm text-neutral-400">No tasks due today. Add something you want to remember.</p>}
          <Link href={`/tasks?date=${today}`} className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.08] px-3.5 py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/[0.13]">Open today&apos;s tasks <ArrowRight size={16} /></Link>
          <Link href="/calendar" className="mt-2 flex items-center justify-between rounded-xl px-3.5 py-2 text-xs text-neutral-400 transition hover:bg-white/[0.05] hover:text-white">Plan your calendar <ArrowRight size={14} /></Link>
        </section>
      </div>
    </div>
  );
}

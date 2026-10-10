"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, FileText, FolderOpen, ListTodo, Plus } from "lucide-react";
import { useSession } from "@/lib/auth-client";

type Resource = { id: string; originalName: string; mimeType: string; sizeBytes: number; status: string; createdAt: string };
type Task = { id: string; title: string; status: "TODO" | "IN_PROGRESS" | "DONE"; dueDate: string | null; priority: string };

function localDay() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function relativeTime(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [resources, setResources] = useState<Resource[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [dateHeading, setDateHeading] = useState("");
  const [greetingText, setGreetingText] = useState("Hello");

  const loadOverview = useCallback(async () => {
    const [resourceResponse, todayResponse, overdueResponse] = await Promise.all([
      fetch("/api/resources"), fetch(`/api/tasks?filter=today&date=${localDay()}`), fetch(`/api/tasks?filter=overdue&date=${localDay()}`),
    ]);
    const [resourcePayload, todayPayload, overduePayload] = await Promise.all([resourceResponse.json(), todayResponse.json(), overdueResponse.json()]);
    if (resourceResponse.ok) setResources(resourcePayload.resources ?? []);
    if (todayResponse.ok) setTodayTasks(todayPayload.tasks ?? []);
    if (overdueResponse.ok) setOverdueCount(overduePayload.tasks?.length ?? 0);
  }, []);

  useEffect(() => {
    void loadOverview();
    const now = new Date();
    setDateHeading(new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now));
    const hour = now.getHours();
    setGreetingText(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, [loadOverview]);

  async function toggleTask(task: Task) {
    const status = task.status === "DONE" ? "TODO" : "DONE";
    const response = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) await loadOverview();
  }

  const recent = [...resources].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  return <div className="mx-auto max-w-[1440px] pb-8 text-white">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-sm font-medium text-neutral-400">{dateHeading}</p><h1 className="text-3xl font-bold tracking-[-0.045em]">{greetingText}, {session?.user?.name?.trim().split(/\s+/)[0] || "there"}</h1><p className="mt-2 text-sm text-neutral-400">Your resources and tasks, in one place.</p></div>
      <Link href="/resources" className="flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/[0.06]"><FolderOpen size={17} /> Open resources</Link>
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Link href="/resources" className="group rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#242529] to-[#17181b] p-5 transition hover:border-white/20"><span className="grid size-10 place-items-center rounded-xl bg-white text-black"><FileText size={20} /></span><p className="mt-4 text-sm text-neutral-400">Resources in your library</p><p className="mt-1 flex items-end justify-between text-2xl font-semibold">{resources.length}<ArrowRight size={18} className="mb-1 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-white" /></p></Link>
      <Link href="/tasks?filter=today" className="group rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#242529] to-[#17181b] p-5 transition hover:border-white/20"><span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.08]"><ListTodo size={20} /></span><p className="mt-4 text-sm text-neutral-400">Tasks due today</p><p className="mt-1 flex items-end justify-between text-2xl font-semibold">{todayTasks.length}<ArrowRight size={18} className="mb-1 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-white" /></p></Link>
      {overdueCount > 0 && <Link href="/tasks?filter=overdue" className="group rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 to-[#17181b] p-5 transition hover:border-amber-400/40"><span className="grid size-10 place-items-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-200"><ListTodo size={20} /></span><p className="mt-4 text-sm text-neutral-400">Overdue tasks</p><p className="mt-1 flex items-end justify-between text-2xl font-semibold">{overdueCount}<ArrowRight size={18} className="mb-1 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-white" /></p></Link>}
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#151619] to-[#101114] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-medium text-neutral-300"><FileText size={17} /> Recently added</div><h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em]">Your library</h2></div><Link href="/resources" className="inline-flex items-center gap-2 rounded-xl bg-white/[0.07] px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/[0.12]">View all <ArrowRight size={15} /></Link></div>
        <div className="mt-3 space-y-1">{recent.length ? recent.map((resource) => <Link href={`/resources?q=${encodeURIComponent(resource.originalName)}`} key={resource.id} className="flex min-h-[54px] items-center gap-4 rounded-xl border border-white/[0.055] bg-white/[0.012] px-3 transition hover:bg-white/[0.045]"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-800 text-neutral-100"><FileText size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-neutral-200">{resource.originalName}</span><span className="mt-0.5 block text-xs text-neutral-500">{resource.mimeType.split("/").pop()?.toUpperCase() || "FILE"} · Added {relativeTime(resource.createdAt)}</span></span><span className="hidden text-xs text-neutral-500 sm:block">{resource.status === "READY" ? "Ready" : "Processing"}</span></Link>) : <div className="flex min-h-20 flex-wrap items-center gap-3 rounded-xl border border-white/[0.055] px-3 text-sm text-neutral-500"><span className="grid size-9 place-items-center rounded-lg bg-white/[0.05]"><FolderOpen size={18} /></span><span>Your resources will appear here after upload.</span><Link href="/upload" className="ml-auto inline-flex items-center gap-1.5 text-neutral-200 hover:text-white"><Plus size={15} /> Upload</Link></div>}</div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#151619] to-[#101114] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-medium text-neutral-300"><ListTodo size={17} /> Today</div><h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em]">Tasks due today</h2></div><Link href="/tasks?filter=today" className="text-xs font-semibold text-neutral-300 hover:text-white">Open list <ArrowRight className="ml-1 inline" size={14} /></Link></div>
        <div className="mt-4 space-y-1">{todayTasks.slice(0, 5).map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.04]"><button onClick={() => void toggleTask(task)} aria-label={task.status === "DONE" ? `Reopen ${task.title}` : `Complete ${task.title}`} className={`grid size-5 shrink-0 place-items-center rounded-full border ${task.status === "DONE" ? "border-emerald-400 bg-emerald-400 text-black" : "border-zinc-600 text-transparent hover:border-white"}`}>{task.status === "DONE" && <Check size={13} />}</button><span className={`min-w-0 flex-1 truncate text-sm ${task.status === "DONE" ? "text-neutral-500 line-through" : "text-neutral-200"}`}>{task.title}</span><span className="text-[11px] text-neutral-500">{task.priority.toLowerCase()}</span></div>)}{!todayTasks.length && <p className="py-5 text-sm text-neutral-500">No tasks due today.</p>}</div>
        <Link href="/tasks" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-800 text-sm font-medium text-neutral-300 transition hover:bg-white/[0.05] hover:text-white"><Plus size={16} /> Manage tasks</Link>
      </section>
    </div>
  </div>;
}

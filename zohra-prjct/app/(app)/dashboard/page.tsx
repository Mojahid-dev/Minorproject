"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Compass,
  FileText,
  Folder,
  LayoutGrid,
  Plus,
} from "lucide-react";

type Resource = {
  id: string;
  originalName: string;
  mimeType: string;
  createdAt: string;
};

function formatRecent(date: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 3_600_000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const cards = [
  { icon: CheckCircle2, eyebrow: "Your workspace is ready", title: "Navigation complete", tone: "light" },
  { icon: BookOpen, eyebrow: "Next up", title: "Build your dashboard", tone: "dark" },
  { icon: Plus, eyebrow: "Turn ideas into progress", title: "Start a new project", tone: "light" },
];

export default function DashboardPage() {
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/resources")
      .then((response) => response.json())
      .then((payload) => {
        if (active && Array.isArray(payload.resources)) {
          setResources([...payload.resources].sort((a: Resource, b: Resource) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ).slice(0, 5));
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] pb-8 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-400">Thursday, July 31</p>
          <h1 className="text-3xl font-bold tracking-[-0.045em] text-white sm:text-[30px]">
            Good morning, Zohra <span className="text-neutral-300">✦</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-400">Here&apos;s a focused view of what needs your attention today.</p>
        </div>
        <Link href="/resources" className="flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.06]">
          <Compass size={17} /> Explore workspace
        </Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ icon: Icon, eyebrow, title, tone }, index) => (
          <Link key={title} href={index === 2 ? "/upload" : index === 1 ? "/resources" : "/dashboard"}
            className="group relative isolate flex min-h-[132px] overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#242529] to-[#17181b] p-5 transition hover:border-white/15 hover:from-[#2a2b30]">
            <div aria-hidden="true" className={`pointer-events-none absolute -right-4 -top-9 size-36 rotate-45 rounded-[28px] border border-white/[0.06] ${index === 1 ? "bg-white/[0.035]" : "bg-gradient-to-br from-white/[0.08] to-transparent"}`} />
            <div className="relative z-10 flex w-full flex-col items-start">
              <span className={`grid size-9 place-items-center rounded-lg shadow-inner ${tone === "light" ? "bg-gradient-to-br from-white to-neutral-300 text-zinc-900" : "border border-white/10 bg-white/[0.08] text-white"}`}><Icon size={20} /></span>
              <p className="mt-4 text-sm text-neutral-300">{eyebrow}</p>
              <p className="mt-0.5 text-lg font-semibold tracking-[-0.025em] text-white">{title}</p>
            </div>
            <span className="absolute bottom-4 right-4 grid size-8 place-items-center rounded-full bg-white/10 text-neutral-100 transition group-hover:bg-white/20"><ArrowRight size={17} /></span>
          </Link>
        ))}
      </div>

      <section className="mt-5 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#151619] to-[#101114] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-300"><Clock3 size={17} /> Recently opened</div>
            <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white">Recent</h2>
          </div>
          <Link href="/resources" className="inline-flex items-center gap-2 rounded-xl bg-white/[0.07] px-3.5 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-white/[0.12]">View all <ArrowRight size={15} /></Link>
        </div>
        <div className="mt-3 space-y-1">
          {resources.length ? resources.map((resource, index) => {
            const Icon = resource.mimeType.includes("pdf") ? FileText : index % 2 ? Folder : LayoutGrid;
            const time = formatRecent(resource.createdAt);
            return (
              <Link href="/resources" key={resource.id} className="group flex min-h-[54px] items-center gap-4 rounded-xl border border-white/[0.055] bg-white/[0.012] px-3 transition hover:bg-white/[0.045]">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#34363b] to-[#24262a] text-neutral-100"><Icon size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-neutral-200">{resource.originalName}</span><span className="mt-0.5 block text-xs text-neutral-500">Resource <span className="px-1">·</span> Added {time}</span></span>
                <span className="hidden text-xs text-neutral-500 sm:block">{time}</span>
                <span className="px-1 text-lg leading-none text-neutral-500">⋮</span>
              </Link>
            );
          }) : (
            <div className="flex min-h-[66px] items-center gap-3 rounded-xl border border-white/[0.055] px-3 text-sm text-neutral-500">
              <span className="grid size-9 place-items-center rounded-lg bg-white/[0.05] text-neutral-400"><Folder size={18} /></span>
              Your recent resources will appear here.
              <Link href="/upload" className="ml-auto inline-flex items-center gap-1.5 text-neutral-200 hover:text-white"><Plus size={15} /> Upload</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

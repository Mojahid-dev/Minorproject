"use client";

import Link from "next/link";
import {
  Clock3,
  ExternalLink,
  FileText,
  Filter,
  FolderOpen,
  Link2,
  MoreHorizontal,
  Presentation,
  Search,
  Upload,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";

type ResourceType = "All" | "Documents" | "Links" | "Videos" | "Slides";

const resources = [
  {
    title: "Cell biology lecture notes",
    type: "Documents",
    format: "PDF",
    detail: "2.4 MB · Added today",
    course: "Biology 101",
    icon: FileText,
    tint: "bg-rose-500/15 text-rose-300",
  },
  {
    title: "Methods for literature reviews",
    type: "Links",
    format: "LINK",
    detail: "Saved yesterday",
    course: "Research methods",
    icon: Link2,
    tint: "bg-sky-500/15 text-sky-300",
  },
  {
    title: "Week 4: Data visualisation",
    type: "Videos",
    format: "VIDEO",
    detail: "42 min · Added Jul 28",
    course: "Data science",
    icon: Video,
    tint: "bg-violet-500/15 text-violet-300",
  },
  {
    title: "Exam revision guide",
    type: "Documents",
    format: "DOCX",
    detail: "1.1 MB · Added Jul 26",
    course: "Personal",
    icon: FileText,
    tint: "bg-amber-500/15 text-amber-300",
  },
  {
    title: "Project planning workshop",
    type: "Slides",
    format: "PPTX",
    detail: "6.8 MB · Added Jul 24",
    course: "Project management",
    icon: Presentation,
    tint: "bg-emerald-500/15 text-emerald-300",
  },
  {
    title: "Academic writing checklist",
    type: "Links",
    format: "LINK",
    detail: "Saved Jul 21",
    course: "Research methods",
    icon: Link2,
    tint: "bg-cyan-500/15 text-cyan-300",
  },
];

const filters: ResourceType[] = ["All", "Documents", "Links", "Videos", "Slides"];

export default function ResourcesPage() {
  const [activeFilter, setActiveFilter] = useState<ResourceType>("All");
  const [query, setQuery] = useState("");

  const visibleResources = useMemo(
    () =>
      resources.filter((resource) => {
        const matchesFilter = activeFilter === "All" || resource.type === activeFilter;
        const searchText = `${resource.title} ${resource.course} ${resource.format}`.toLowerCase();
        return matchesFilter && searchText.includes(query.trim().toLowerCase());
      }),
    [activeFilter, query],
  );

  return (
    <div className="mx-auto max-w-6xl text-white">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-400">
            <FolderOpen size={17} /> Personal library
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Resources</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
            Keep course material, useful links, and reference files together so they are easy to return to.
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
        >
          <Upload size={17} /> Upload resource
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["12", "Resources saved"],
          ["4", "Courses organised"],
          ["2", "Added this week"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-2xl font-bold tracking-[-0.04em]">{value}</p>
            <p className="mt-1 text-sm text-neutral-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resources..."
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-500 focus:border-zinc-600"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-neutral-500" />
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-lg px-3 py-2 text-sm transition ${activeFilter === filter ? "bg-white text-black font-semibold" : "text-neutral-400 hover:bg-white/10 hover:text-white"}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Your library</h2>
            <p className="mt-1 text-sm text-neutral-500">{visibleResources.length} resource{visibleResources.length === 1 ? "" : "s"} shown</p>
          </div>
          <button className="flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white">
            <Clock3 size={16} /> Recently added
          </button>
        </div>

        {visibleResources.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleResources.map(({ title, format, detail, course, icon: Icon, tint }) => (
              <article key={title} className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-600 hover:bg-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <div className={`grid size-11 place-items-center rounded-xl ${tint}`}><Icon size={21} /></div>
                  <button aria-label={`More options for ${title}`} className="rounded-lg p-1.5 text-neutral-500 opacity-100 transition hover:bg-white/10 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"><MoreHorizontal size={18} /></button>
                </div>
                <p className="mt-5 truncate font-semibold">{title}</p>
                <p className="mt-1 text-sm text-neutral-500">{course}</p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-800 pt-3 text-xs text-neutral-500">
                  <span>{detail}</span>
                  <span className="flex items-center gap-1 font-semibold text-neutral-300">{format} <ExternalLink size={13} /></span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-700 py-16 text-center">
            <FolderOpen className="mx-auto text-neutral-500" size={28} />
            <h2 className="mt-4 font-semibold">No matching resources</h2>
            <p className="mt-2 text-sm text-neutral-500">Try a different search or upload something new.</p>
          </div>
        )}
      </section>
    </div>
  );
}

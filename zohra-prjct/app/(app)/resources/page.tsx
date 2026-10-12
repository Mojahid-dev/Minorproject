"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, CalendarDays, CheckCircle2, Clock3, FileText, Filter, FolderOpen, FolderTree, LoaderCircle, RotateCcw, ShieldAlert, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type OrganizationStatus = "PENDING" | "PROCESSING" | "ORGANIZED" | "NEEDS_REVIEW" | "FAILED";
type Resource = {
  id: string; originalName: string; mimeType: string; sizeBytes: number; status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  textExtractionStatus: "NOT_STARTED" | "EXTRACTING" | "EXTRACTED" | "NO_TEXT" | "FAILED" | "NOT_APPLICABLE"; pageCount: number | null;
  organizationStatus: OrganizationStatus; organizationNote: string | null; studyYearId: string | null; semesterId: string | null; subjectId: string | null; chapterId: string | null;
  studyYear: { id: string; label: string } | null; semester: { id: string; name: string } | null; subject: { id: string; name: string } | null; chapter: { id: string; name: string } | null; createdAt: string; updatedAt: string;
};
type Chapter = { id: string; name: string; aliases: string[] };
type Subject = { id: string; name: string; aliases: string[]; chapters: Chapter[] };
type Semester = { id: string; name: string; aliases: string[]; subjects: Subject[] };
type StudyYear = { id: string; label: string; aliases: string[]; semesters: Semester[] };
type Tab = "subjects" | "all" | "recent" | "review";
type Filter = "all" | "document" | "presentation" | "image" | "other";
type TextRecord = { id: string; originalName: string; textExtractionStatus: Resource["textExtractionStatus"]; extractedText: string | null; extractedTextLength: number | null; pageCount: number | null; extractionError: string | null };

function fileKind(resource: Resource): Filter {
  const type = resource.mimeType.toLowerCase();
  if (type.includes("presentation") || type.includes("powerpoint")) return "presentation";
  if (type.startsWith("image/")) return "image";
  if (type.includes("pdf") || type.includes("word") || type.startsWith("text/")) return "document";
  return "other";
}

function typeName(resource: Resource) {
  const extension = resource.originalName.split(".").pop()?.toUpperCase();
  return extension && extension !== resource.originalName.toUpperCase() ? extension : resource.mimeType.split("/").pop()?.toUpperCase() || "FILE";
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAdded(date: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(date));
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [years, setYears] = useState<StudyYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("subjects");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [textRecord, setTextRecord] = useState<TextRecord | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState<number | null>(null);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [resourceResponse, treeResponse] = await Promise.all([fetch("/api/resources", { cache: "no-store" }), fetch("/api/study-structure", { cache: "no-store" })]);
      const [resourcePayload, treePayload] = await Promise.all([resourceResponse.json(), treeResponse.json()]);
      if (!resourceResponse.ok) throw new Error(resourcePayload.error || "Could not load your resources.");
      if (!treeResponse.ok) throw new Error(treePayload.error || "Could not load your course folders.");
      setResources(resourcePayload.resources);
      setYears(treePayload.years);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load the resource library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(false); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!resources.some((resource) => resource.organizationStatus === "PROCESSING" || resource.organizationStatus === "PENDING")) return;
    const timer = window.setInterval(() => void loadData(false), 3500);
    return () => window.clearInterval(timer);
  }, [resources, loadData]);

  const visible = useMemo(() => {
    const filtered = resources.filter((resource) => filter === "all" || fileKind(resource) === filter);
    if (tab === "recent") return [...filtered].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (tab === "review") return filtered.filter((resource) => resource.organizationStatus === "NEEDS_REVIEW" || resource.organizationStatus === "FAILED" || resource.organizationStatus === "PENDING");
    return filtered;
  }, [resources, filter, tab]);

  async function assign(resource: Resource, location: { studyYearId?: string | null; semesterId?: string | null; subjectId?: string | null; chapterId?: string | null }) {
    setBusyId(resource.id); setActionError("");
    try {
      const response = await fetch(`/api/resources/${resource.id}/organization`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(location) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save this course location.");
      setSelectedResource(null);
      await loadData(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save this course location.");
    } finally { setBusyId(null); }
  }

  async function retry(resource: Resource) {
    setBusyId(resource.id); setActionError("");
    try {
      const response = await fetch(`/api/resources/${resource.id}/process`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not retry organization.");
      setResources((items) => items.map((item) => item.id === resource.id ? { ...item, organizationStatus: "PROCESSING", status: "PROCESSING" } : item));
      await loadData(false);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not retry organization."); }
    finally { setBusyId(null); }
  }

  async function remove(resource: Resource) {
    setDeleteId(resource.id); setActionError("");
    try {
      const response = await fetch(`/api/resources/${resource.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not remove this resource.");
      setResources((items) => items.filter((item) => item.id !== resource.id));
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not remove this resource."); }
    finally { setDeleteId(null); }
  }

  async function viewText(resource: Resource) {
    setTextLoading(true); setTextRecord(null);
    try {
      const response = await fetch(`/api/resources/${resource.id}/text`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load extracted text.");
      setTextRecord(payload.resource);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not load extracted text."); }
    finally { setTextLoading(false); }
  }

  const tabs: { id: Tab; label: string; icon: typeof FolderTree; count?: number }[] = [
    { id: "subjects", label: "Courses", icon: FolderTree },
    { id: "all", label: "All resources", icon: FileText },
    { id: "recent", label: "Recently added", icon: Clock3 },
    { id: "review", label: "Needs review", icon: ShieldAlert, count: resources.filter((resource) => resource.organizationStatus === "NEEDS_REVIEW" || resource.organizationStatus === "FAILED").length },
  ];

  return <main className="mx-auto max-w-[1440px] pb-10 text-white">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-semibold uppercase tracking-[0.17em] text-violet-200">Your private study library</p><h1 className="mt-2 font-serif text-4xl font-medium tracking-[-0.055em] sm:text-6xl">Resources</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-lg">Your materials, arranged by academic year, semester, subject, and chapter.</p></div>
      <div className="flex flex-col gap-2 sm:flex-row"><Link href="/resources/courses" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 text-sm font-medium text-neutral-200 transition hover:bg-white/[0.06]"><FolderTree size={16} /> Manage courses</Link><Link href="/upload" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-neutral-200"><Upload size={16} /> Add resources</Link></div>
    </header>

    {(loadError || actionError) && <div role="alert" className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-rose-300/20 bg-rose-300/[0.07] px-4 py-3 text-sm text-rose-100"><span>{loadError || actionError}</span>{loadError && <button onClick={() => void loadData()} className="shrink-0 underline">Retry</button>}</div>}
    <nav aria-label="Resource views" className="-mx-4 mt-6 flex gap-1 overflow-x-auto border-y border-zinc-800 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:rounded-xl sm:border sm:bg-zinc-950/30">
      {tabs.map(({ id, label, icon: Icon, count }) => <button key={id} onClick={() => setTab(id)} className={`${tab === id ? "bg-white text-black" : "text-neutral-400 hover:bg-white/[0.07] hover:text-white"} inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition sm:px-4 sm:text-sm`}><Icon size={16} />{label}{typeof count === "number" && count > 0 && <span className={`${tab === id ? "bg-black/10" : "bg-white/[0.08]"} rounded-full px-2 py-0.5 text-[10px]`}>{count}</span>}</button>)}
      <label className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs text-neutral-400"><Filter size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filter by file type" className="max-w-28 bg-transparent text-neutral-200 outline-none"><option value="all">All types</option><option value="document">Documents</option><option value="presentation">Slides</option><option value="image">Images</option><option value="other">Other files</option></select></label>
    </nav>

    {tab === "subjects" ? <CourseLibrary years={years} resources={resources} loading={loading} onOrganize={setSelectedResource} /> : <section className="mt-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">{tab === "review" ? "Review your uploads" : tab === "recent" ? "Recently added" : "All resources"}</h2><p className="mt-1 text-xs leading-5 text-neutral-500">{tab === "review" ? "Files without a clear course match stay here until you choose a location." : "Each file keeps its original name and private storage location."}</p></div><span className="text-xs text-neutral-500">{visible.length} file{visible.length === 1 ? "" : "s"}</span></div>
      {loading ? <div className="space-y-2">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-24 rounded-2xl bg-zinc-900" />)}</div> : visible.length === 0 ? <EmptyState review={tab === "review"} hasCourses={years.length > 0} /> : <div className="space-y-2">{visible.map((resource) => <ResourceCard key={resource.id} resource={resource} now={now} busy={busyId === resource.id} deleting={deleteId === resource.id} onOrganize={() => setSelectedResource(resource)} onRetry={() => void retry(resource)} onDelete={() => void remove(resource)} onViewText={() => void viewText(resource)} />)}</div>}
    </section>}
    {selectedResource && <OrganizerDialog resource={selectedResource} years={years} busy={busyId === selectedResource.id} error={actionError} onClose={() => setSelectedResource(null)} onSave={(location) => void assign(selectedResource, location)} />}
    {(textLoading || textRecord) && <TextDialog loading={textLoading} record={textRecord} onClose={() => { setTextRecord(null); setTextLoading(false); }} />}
  </main>;
}

function CourseLibrary({ years, resources, loading, onOrganize }: { years: StudyYear[]; resources: Resource[]; loading: boolean; onOrganize: (resource: Resource) => void }) {
  if (loading) return <div className="mt-6 grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-52 rounded-2xl bg-zinc-900" />)}</div>;
  if (!years.length) return <section className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-white/[0.02] px-5 py-12 text-center"><FolderTree size={30} className="mx-auto text-neutral-500" /><h2 className="mt-3 font-semibold">Set up your course folders</h2><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-neutral-400">Add an academic year, semesters, subjects, and chapters. Zohra will match those names against readable file names and text. Unclear files will stay in Needs review.</p><Link href="/resources/courses" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black"><PlusIcon /> Create course structure <ArrowRight size={15} /></Link><div className="mt-8 border-t border-white/[0.07] pt-5 text-left"><FolderHeading name="Unsorted" count={resources.filter((item) => !item.subjectId).length} /><ResourceStack resources={resources.filter((item) => !item.subjectId)} onOrganize={onOrganize} /></div></section>;
  return <section className="mt-6 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Your subjects</h2><p className="mt-1 text-xs text-neutral-500">Open a year or chapter to find the files filed there.</p></div><span className="text-xs text-neutral-500">{resources.filter((item) => item.subjectId).length} organized · {resources.filter((item) => !item.subjectId).length} unsorted</span></div>
    {years.map((year) => <details key={year.id} className="group rounded-2xl border border-zinc-800 bg-zinc-900/40" open={years.length === 1}><summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/[0.025] [&::-webkit-details-marker]:hidden"><span className="grid size-10 place-items-center rounded-xl bg-violet-200/[0.08] text-violet-100"><CalendarDays size={19} /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{year.label}</span><span className="mt-0.5 block text-xs text-neutral-500">{year.semesters.length} semester{year.semesters.length === 1 ? "" : "s"}</span></span><span className="mr-1 text-xs text-neutral-500">{resources.filter((item) => item.studyYearId === year.id).length} files</span><span className="text-neutral-500 transition group-open:rotate-180">⌄</span></summary>
      <div className="space-y-3 border-t border-white/[0.06] p-3 sm:p-4">{year.semesters.length ? year.semesters.map((semester) => <details key={semester.id} className="rounded-xl border border-white/[0.06] bg-black/15"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden"><span className="grid size-8 place-items-center rounded-lg bg-white/[0.06] text-neutral-300"><FolderOpen size={16} /></span><span className="flex-1 text-sm font-medium">{semester.name}</span><span className="text-xs text-neutral-500">{resources.filter((item) => item.semesterId === semester.id).length} files</span></summary>
        <div className="space-y-3 border-t border-white/[0.05] p-3">{semester.subjects.length ? semester.subjects.map((subject) => <details key={subject.id} className="rounded-xl border border-white/[0.06] bg-zinc-950/35" open={semester.subjects.length === 1}><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden"><span className="min-w-0 flex-1 truncate text-sm font-semibold">{subject.name}</span><span className="text-xs text-neutral-500">{resources.filter((item) => item.subjectId === subject.id).length} files</span></summary><div className="space-y-3 border-t border-white/[0.05] p-3">
          <ResourceStack resources={resources.filter((item) => item.subjectId === subject.id && !item.chapterId)} onOrganize={onOrganize} />
          {subject.chapters.length ? subject.chapters.map((chapter) => <details key={chapter.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02]"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden"><span className="flex-1 text-xs font-medium text-neutral-200">{chapter.name}</span><span className="text-[11px] text-neutral-500">{resources.filter((item) => item.chapterId === chapter.id).length}</span></summary><div className="border-t border-white/[0.05] p-2"><ResourceStack resources={resources.filter((item) => item.chapterId === chapter.id)} onOrganize={onOrganize} /></div></details>) : <p className="text-xs text-neutral-600">No chapters yet. <Link href="/resources/courses" className="text-violet-200 hover:text-white">Add chapters</Link></p>}
        </div></details>) : <p className="text-xs text-neutral-500">No subjects in this semester yet.</p>}</div>
      </details>) : <p className="text-xs text-neutral-500">No semesters in this year yet.</p>}</div>
    </details>)}
    <section className="rounded-2xl border border-dashed border-zinc-700 bg-white/[0.015] p-4"><FolderHeading name="Unsorted" count={resources.filter((item) => !item.subjectId).length} /><p className="mt-1 text-xs text-neutral-500">These files need a course location or a clearer name/alias to match.</p><ResourceStack resources={resources.filter((item) => !item.subjectId)} onOrganize={onOrganize} /></section>
  </section>;
}

function FolderHeading({ name, count }: { name: string; count: number }) { return <div className="flex items-center gap-2"><FolderOpen size={16} className="text-neutral-500" /><h3 className="text-sm font-semibold">{name}</h3><span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-neutral-400">{count}</span></div>; }
function PlusIcon() { return <span className="text-lg leading-none">+</span>; }

function ResourceStack({ resources, onOrganize }: { resources: Resource[]; onOrganize: (resource: Resource) => void }) {
  if (!resources.length) return <p className="py-1 text-xs text-neutral-600">No files in this folder</p>;
  return <ul className="space-y-1">{resources.map((resource) => <li key={resource.id} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/[0.035]"><FileText size={15} className="shrink-0 text-neutral-500" /><span className="min-w-0 flex-1 truncate text-xs text-neutral-200">{resource.originalName}</span><StatusBadge resource={resource} /><button onClick={() => onOrganize(resource)} className="min-h-8 shrink-0 rounded-lg px-2 text-[11px] text-violet-200 hover:bg-white/[0.07] hover:text-white">Move</button></li>)}</ul>;
}

function ResourceCard({ resource, now, busy, deleting, onOrganize, onRetry, onDelete, onViewText }: { resource: Resource; now: number | null; busy: boolean; deleting: boolean; onOrganize: () => void; onRetry: () => void; onDelete: () => void; onViewText: () => void }) {
  const location = [resource.studyYear?.label, resource.semester?.name, resource.subject?.name, resource.chapter?.name].filter(Boolean).join(" → ");
  const processable = ["pdf", "docx", "pptx", "txt", "md"].includes(resource.originalName.split(".").pop()?.toLowerCase() ?? "");
  const staleProcessing = resource.organizationStatus === "PROCESSING" && now !== null && now - new Date(resource.updatedAt).getTime() > 3 * 60_000;
  const canRetry = resource.organizationStatus === "FAILED" || resource.organizationStatus === "NEEDS_REVIEW" || (resource.organizationStatus === "PENDING" && resource.status === "READY") || staleProcessing;
  return <article className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-3.5 sm:p-4"><div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-neutral-200"><FileText size={18} /></span><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium text-white">{resource.originalName}</p><p className="mt-1 text-xs text-neutral-500">{typeName(resource)} <span className="px-1 text-neutral-700">·</span> {formatSize(resource.sizeBytes)} <span className="px-1 text-neutral-700">·</span> {formatAdded(resource.createdAt)}</p><div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge resource={resource} />{location ? <span className="max-w-full break-words text-xs text-neutral-400">{location}</span> : null}</div>{resource.organizationNote && (resource.organizationStatus === "NEEDS_REVIEW" || resource.organizationStatus === "FAILED") && <p className="mt-2 text-xs leading-5 text-amber-100/75">{resource.organizationNote}</p>}</div></div>
    <div className="mt-3 flex flex-wrap justify-end gap-1 border-t border-white/[0.06] pt-2">{processable && resource.textExtractionStatus === "EXTRACTED" && <button onClick={onViewText} aria-label={`View extracted text for ${resource.originalName}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs text-neutral-400 hover:bg-white/[0.07] hover:text-white"><BookOpenText size={15} /> View text</button>}{(resource.organizationStatus === "NEEDS_REVIEW" || resource.organizationStatus === "FAILED" || resource.organizationStatus === "ORGANIZED") && <button onClick={onOrganize} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs text-violet-200 hover:bg-white/[0.07] hover:text-white"><FolderTree size={14} /> {location ? "Move" : "Choose folder"}</button>}{canRetry && <button disabled={busy} onClick={onRetry} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs text-neutral-300 hover:bg-white/[0.07] disabled:opacity-50">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <RotateCcw size={14} />} Retry</button>}<button disabled={deleting} onClick={onDelete} aria-label={`Delete ${resource.originalName}`} className="grid size-9 place-items-center rounded-lg text-neutral-500 hover:bg-rose-300/10 hover:text-rose-200 disabled:opacity-50">{deleting ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}</button></div>
  </article>;
}

function StatusBadge({ resource }: { resource: Resource }) {
  const values: Record<OrganizationStatus, { label: string; className: string }> = {
    PENDING: { label: "Waiting", className: "bg-white/[0.07] text-neutral-300" }, PROCESSING: { label: "Organizing…", className: "bg-sky-300/10 text-sky-100" }, ORGANIZED: { label: "Organized", className: "bg-emerald-300/10 text-emerald-100" }, NEEDS_REVIEW: { label: "Needs review", className: "bg-amber-300/10 text-amber-100" }, FAILED: { label: "Could not read", className: "bg-rose-300/10 text-rose-100" },
  };
  const value = values[resource.organizationStatus];
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${value.className}`}>{resource.organizationStatus === "ORGANIZED" ? <CheckCircle2 size={11} /> : resource.organizationStatus === "PROCESSING" ? <LoaderCircle size={11} className="animate-spin" /> : resource.organizationStatus === "NEEDS_REVIEW" || resource.organizationStatus === "FAILED" ? <ShieldAlert size={11} /> : <Clock3 size={11} />}{value.label}</span>;
}

function EmptyState({ review, hasCourses }: { review: boolean; hasCourses: boolean }) {
  return <div className="rounded-2xl border border-dashed border-zinc-700 px-5 py-14 text-center"><FolderOpen size={27} className="mx-auto text-neutral-500" /><p className="mt-3 font-medium">{review ? "Everything is in its place" : "No resources here yet"}</p><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-neutral-500">{review ? "New files with unclear names will appear here for you to organize." : "Upload course material and it will appear here with its organization status."}</p>{!review && !hasCourses && <Link href="/resources/courses" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm text-neutral-200"><FolderTree size={15} /> Set up your course folders</Link>}</div>;
}

function OrganizerDialog({ resource, years, busy, error, onClose, onSave }: { resource: Resource; years: StudyYear[]; busy: boolean; error: string; onClose: () => void; onSave: (location: { studyYearId: string | null; semesterId: string | null; subjectId: string | null; chapterId: string | null }) => void }) {
  const [yearId, setYearId] = useState(resource.studyYearId ?? "");
  const [semesterId, setSemesterId] = useState(resource.semesterId ?? "");
  const [subjectId, setSubjectId] = useState(resource.subjectId ?? "");
  const [chapterId, setChapterId] = useState(resource.chapterId ?? "");
  const semesters = years.find((year) => year.id === yearId)?.semesters ?? [];
  const subjects = semesters.find((semester) => semester.id === semesterId)?.subjects ?? [];
  const chapters = subjects.find((subject) => subject.id === subjectId)?.chapters ?? [];
  const selectClass = "min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-violet-300/70";
  return <div role="presentation" className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="organize-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-zinc-700 bg-[#151518] p-5 shadow-2xl sm:rounded-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-200">Choose one main folder</p><h2 id="organize-title" className="mt-2 text-xl font-semibold">Organize this file</h2><p className="mt-1 break-words text-sm text-neutral-400">{resource.originalName}</p></div><button onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-lg text-neutral-400 hover:bg-white/[0.08]"><X size={18} /></button></div>
    {years.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-neutral-400">Create your academic year and course folders first. <Link href="/resources/courses" className="mt-2 inline-flex text-violet-200 underline">Manage course folders</Link></div> : <div className="mt-5 space-y-3"><label className="block text-xs font-medium text-neutral-300">Academic year<select value={yearId} onChange={(event) => { setYearId(event.target.value); setSemesterId(""); setSubjectId(""); setChapterId(""); }} className={`${selectClass} mt-1.5`}><option value="">Choose or leave unsorted</option>{years.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}</select></label><label className="block text-xs font-medium text-neutral-300">Semester<select disabled={!yearId} value={semesterId} onChange={(event) => { setSemesterId(event.target.value); setSubjectId(""); setChapterId(""); }} className={`${selectClass} mt-1.5 disabled:opacity-40`}><option value="">Choose a semester</option>{semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}</select></label><label className="block text-xs font-medium text-neutral-300">Subject<select disabled={!semesterId} value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setChapterId(""); }} className={`${selectClass} mt-1.5 disabled:opacity-40`}><option value="">Choose a subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label className="block text-xs font-medium text-neutral-300">Chapter <span className="font-normal text-neutral-500">(optional)</span><select disabled={!subjectId} value={chapterId} onChange={(event) => setChapterId(event.target.value)} className={`${selectClass} mt-1.5 disabled:opacity-40`}><option value="">No chapter</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}</select></label></div>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p>}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><button disabled={busy} onClick={() => onSave({ studyYearId: null, semesterId: null, subjectId: null, chapterId: null })} className="min-h-11 rounded-xl border border-zinc-700 px-4 text-sm text-neutral-300 hover:bg-white/[0.05] disabled:opacity-50">Move to Unsorted</button><div className="flex gap-2"><button onClick={onClose} className="min-h-11 flex-1 rounded-xl px-4 text-sm text-neutral-400 hover:bg-white/[0.05] sm:flex-none">Cancel</button><button disabled={busy || !subjectId} onClick={() => onSave({ studyYearId: yearId || null, semesterId: semesterId || null, subjectId: subjectId || null, chapterId: chapterId || null })} className="min-h-11 flex-1 rounded-xl bg-white px-4 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50 sm:flex-none">{busy ? "Saving…" : "Save location"}</button></div></div>
  </section></div>;
}

function TextDialog({ loading, record, onClose }: { loading: boolean; record: TextRecord | null; onClose: () => void }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Extracted text" className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950"><header className="flex items-start justify-between border-b border-zinc-800 px-4 py-4 sm:px-5"><div className="min-w-0"><h2 className="font-semibold">Readable document text</h2><p className="mt-1 truncate text-xs text-neutral-500">{record?.originalName ?? "Loading…"}{record?.pageCount ? ` · ${record.pageCount} pages` : ""}</p></div><button onClick={onClose} aria-label="Close extracted text" className="grid size-9 shrink-0 place-items-center rounded-lg text-neutral-400 hover:bg-white/[0.08]"><X size={18} /></button></header><div className="min-h-40 overflow-y-auto p-4 sm:p-5">{loading ? <p className="text-sm text-neutral-400">Loading extracted text…</p> : record?.extractedText ? <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-neutral-300">{record.extractedText}</pre> : <p className="text-sm leading-6 text-neutral-400">{record?.extractionError || "No selectable text was found. Scans and images are not read automatically in this version."}</p>}</div></section></div>;
}

"use client";

import {
  CheckCircle2,
  Database,
  FileText,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  FolderTree,
  Tag,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Skeleton } from "@/components/ui/skeleton";
import { validateResourceFile } from "@/lib/resource-validation";

type UploadItem = {
  id: string;
  resourceId: string;
  userId: string;
  storageKey: string;
  uploadedAt: string | null;
  file: File;
  checksum: string;
  status: "ready" | "uploading" | "complete" | "error";
  phase?: "validating" | "creating-resource" | "authorizing-upload" | "uploading-to-blob" | "complete" | "error";
  error?: string;
  progress?: number;
};

type SavedResource = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  organizationStatus: "PENDING" | "PROCESSING" | "ORGANIZED" | "NEEDS_REVIEW" | "FAILED";
  organizationNote?: string | null;
  awaitingOrganizationInput: boolean;
  tags: string[];
  studyYearId?: string | null;
  semesterId?: string | null;
  subjectId?: string | null;
  chapterId?: string | null;
  studyYear?: { id: string; label: string } | null;
  semester?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
  chapter?: { id: string; name: string } | null;
  createdAt: string;
};

type StudyYear = { id: string; label: string; semesters: { id: string; name: string; subjects: { id: string; name: string; chapters: { id: string; name: string }[] }[] }[] };

const acceptedTypes = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.jpg,.jpeg,.png,.mp4,.mov,.webm";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toUpperCase();
  return extension ? `${extension} file` : "Unknown file type";
}

function formatModifiedDate(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

const uploadSteps = [
  { id: "validating", label: "Checking your file", icon: ShieldCheck },
  { id: "creating-resource", label: "Preparing your resource", icon: Database },
  { id: "authorizing-upload", label: "Securing your upload", icon: ShieldCheck },
  { id: "uploading-to-blob", label: "Uploading your file", icon: UploadCloud },
] as const;

const phaseOrder = Object.fromEntries(uploadSteps.map((step, index) => [step.id, index]));

function UploadFlow({ item }: { item: UploadItem }) {
  const currentStep = item.phase === "complete" ? uploadSteps.length - 1 : phaseOrder[item.phase ?? "validating"] ?? 0;
  const activeStep = uploadSteps[currentStep];
  const percent = item.status === "complete" ? 100 : Math.round((currentStep / uploadSteps.length) * 100 + (item.phase === "uploading-to-blob" ? (item.progress ?? 0) / uploadSteps.length : 0));
  const status = item.status === "complete" ? "Added to your library" : item.status === "error" ? "Couldn’t upload this file" : activeStep?.label ?? "Preparing upload";

  return (
    <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className={`min-w-0 truncate text-xs font-medium ${item.status === "error" ? "text-rose-300" : item.status === "complete" ? "text-emerald-300" : "text-neutral-300"}`}>
          {item.status === "uploading" && <LoaderCircle size={13} className="mr-1.5 inline animate-spin" />}
          {item.status === "complete" && <CheckCircle2 size={13} className="mr-1.5 inline" />}
          {status}
        </p>
        {item.status !== "error" && <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">{percent}%</span>}
      </div>
      {item.status === "error" ? <p role="alert" className="mt-1 text-xs leading-5 text-rose-200">{item.error || "Please try adding this file again."}</p> : <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-label={`${status}: ${item.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className={`h-full rounded-full transition-[width] duration-300 ${item.status === "complete" ? "bg-emerald-300" : "bg-gradient-to-r from-violet-300 to-sky-200"}`} style={{ width: `${percent}%` }} /></div>}
    </div>
  );
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

async function fileChecksum(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function resourceStatus(resource: SavedResource) {
  if (resource.status === "FAILED") return { label: "Upload failed", complete: false };
  if (resource.awaitingOrganizationInput) return { label: "Add course details", complete: false };
  if (resource.organizationStatus === "ORGANIZED") return { label: "Organized", complete: true };
  if (resource.organizationStatus === "NEEDS_REVIEW") return { label: "Needs review", complete: false };
  if (resource.organizationStatus === "FAILED") return { label: "Could not organize", complete: false };
  return { label: resource.organizationStatus === "PROCESSING" ? "Organizing…" : "Waiting to organize…", complete: false };
}


export default function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [savedResources, setSavedResources] = useState<SavedResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null);
  const [years, setYears] = useState<StudyYear[]>([]);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [organizing, setOrganizing] = useState(false);
  const [organizeNotice, setOrganizeNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function loadResources() {
      try {
        const [resourceResponse, structureResponse] = await Promise.all([fetch("/api/resources"), fetch("/api/study-structure")]);
        const [resourcePayload, structurePayload] = await Promise.all([resourceResponse.json(), structureResponse.json()]);
        if (resourceResponse.ok && active) setSavedResources(resourcePayload.resources);
        if (structureResponse.ok && active) setYears(structurePayload.years);
      } finally {
        if (active) setIsLoadingResources(false);
      }
    }

    void loadResources();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!savedResources.some((resource) => resource.organizationStatus === "PENDING" || resource.organizationStatus === "PROCESSING")) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/resources", { cache: "no-store" });
        const payload = await response.json();
        if (response.ok) setSavedResources(payload.resources);
      } catch {
        // Keep the last known upload state; the next poll can recover automatically.
      }
    }, 3500);
    return () => window.clearInterval(timer);
  }, [savedResources]);

  async function addFiles(files: FileList | File[]) {
    const rejected: string[] = [];
    const knownChecksums = new Set(items.map((item) => item.checksum));
    const incoming: UploadItem[] = [];
    for (const file of Array.from(files)) {
      const error = validateResourceFile(file);
      if (error) {
        rejected.push(`${file.name}: ${error}`);
        continue;
      }
      const checksum = await fileChecksum(file);
      if (knownChecksums.has(checksum)) {
        rejected.push(`${file.name}: This file is already in your upload queue.`);
        continue;
      }
      knownChecksums.add(checksum);
      incoming.push({
        id: crypto.randomUUID(),
        resourceId: "",
        userId: "",
        storageKey: "",
        uploadedAt: null,
        file,
        checksum,
        status: "ready" as const,
      });
    }
    setValidationErrors(rejected);
    setItems((current) => [...incoming, ...current]);
  }

  async function uploadFiles() {
    const readyItems = items.filter((item) => item.status === "ready");
    setItems((current) => current.map((item) => item.status === "ready" ? { ...item, status: "uploading", phase: "validating", progress: 0 } : item));
    await Promise.all(readyItems.map(async (item) => {
      try {
        await delay(450);
        setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, phase: "creating-resource" } : currentItem));
        const response = await fetch("/api/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: item.file.name, type: item.file.type, size: item.file.size, checksum: item.checksum }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to save resource metadata.");
        setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, phase: "authorizing-upload" } : currentItem));
        await delay(350);
        setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, phase: "uploading-to-blob" } : currentItem));
        const blob = await upload(payload.resource.storageKey, item.file, {
          access: "private",
          handleUploadUrl: "/api/resources/upload",
          clientPayload: JSON.stringify({ resourceId: payload.resource.id }),
          multipart: true,
          onUploadProgress: ({ percentage }) => {
            setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, progress: percentage } : currentItem));
          },
        });
        setItems((current) => current.map((currentItem) => currentItem.id === item.id ? {
          ...currentItem,
          resourceId: payload.resource.id,
          userId: payload.resource.userId,
          storageKey: blob.pathname,
          uploadedAt: payload.resource.createdAt,
          status: "complete",
          phase: "complete",
          progress: 100,
        } : currentItem));
        setSavedResources((current) => [{
          id: payload.resource.id,
          originalName: payload.resource.originalName,
          mimeType: payload.resource.mimeType,
          sizeBytes: payload.resource.sizeBytes,
          status: "READY",
          organizationStatus: "PENDING",
          organizationNote: null,
          awaitingOrganizationInput: true,
          tags: [],
          createdAt: payload.resource.createdAt,
        }, ...current]);
        setSelectedOrganizationIds((current) => [payload.resource.id, ...current]);
      } catch (error) {
        setItems((current) => current.map((currentItem) => currentItem.id === item.id ? {
          ...currentItem,
          status: "error",
          phase: "error",
          error: error instanceof Error ? error.message : "Unable to save resource metadata.",
        } : currentItem));
      }
    }));
  }

  function addTag(value = tagDraft) {
    const cleaned = value.trim().replace(/^#/, "").replace(/,+$/, "").trim();
    if (!cleaned) return;
    if (!tags.some((tag) => tag.toLocaleLowerCase() === cleaned.toLocaleLowerCase())) setTags((current) => [...current, cleaned]);
    setTagDraft("");
  }

  function toggleOrganizationSelection(resourceId: string) {
    setSelectedOrganizationIds((current) => current.includes(resourceId) ? current.filter((id) => id !== resourceId) : current.length < 50 ? [...current, resourceId] : current);
  }

  async function organizeSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrganizationIds.length) return;
    const finalTags = [...tags];
    const pendingTag = tagDraft.trim().replace(/^#/, "");
    if (pendingTag && !finalTags.some((tag) => tag.toLowerCase() === pendingTag.toLowerCase())) finalTags.push(pendingTag);
    setOrganizing(true);
    setValidationErrors([]);
    setOrganizeNotice("");
    try {
      const response = await fetch("/api/resources/organize-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceIds: selectedOrganizationIds, year: academicYear, semester, subject, unit, tags: finalTags }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not organize these files.");
      const resourceResponse = await fetch("/api/resources", { cache: "no-store" });
      const resourcePayload = await resourceResponse.json();
      if (resourceResponse.ok) setSavedResources(resourcePayload.resources);
      setSelectedOrganizationIds([]);
      setTags([]);
      setTagDraft("");
      setOrganizeNotice(`${payload.count} file${payload.count === 1 ? "" : "s"} placed in ${[payload.names.year, payload.names.semester, payload.names.subject, payload.names.unit].filter(Boolean).join(" → ")}.`);
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : "Could not organize these files."]);
    } finally {
      setOrganizing(false);
    }
  }

  async function skipTagging() {
    if (!selectedOrganizationIds.length) return;
    setOrganizing(true);
    setValidationErrors([]);
    try {
      const results = await Promise.all(selectedOrganizationIds.map(async (id) => {
        const response = await fetch(`/api/resources/${id}/process`, { method: "POST" });
        const payload = await response.json();
        if (!response.ok && response.status !== 409) throw new Error(payload.error || "Could not start filename organization.");
      }));
      void results;
      setSelectedOrganizationIds([]);
      setOrganizeNotice("Zohra is checking the selected file names and readable text. Anything unclear will appear in Needs review.");
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : "Could not start filename organization."]);
    } finally {
      setOrganizing(false);
    }
  }

  function removeFile(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function deleteResource(resourceId: string) {
    setDeletingResourceId(resourceId);
    try {
      const response = await fetch(`/api/resources/${resourceId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to remove this resource.");
      setSavedResources((current) => current.filter((resource) => resource.id !== resourceId));
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : "Unable to remove this resource."]);
    } finally {
      setDeletingResourceId(null);
    }
  }

  const readyCount = items.filter((item) => item.status === "ready").length;
  const needsOrganization = savedResources.filter((resource) => resource.status === "READY" && (resource.awaitingOrganizationInput || resource.organizationStatus === "NEEDS_REVIEW" || resource.organizationStatus === "FAILED" || resource.organizationStatus === "PENDING"));
  const selectedFileNames = savedResources.filter((resource) => selectedOrganizationIds.includes(resource.id)).map((resource) => resource.originalName);

  return (
    <div className="mx-auto max-w-6xl pb-8 text-white">
      <header className="relative isolate overflow-hidden rounded-[28px] border border-violet-200/[0.1] bg-[#121217] p-5 sm:p-7">
        <div aria-hidden="true" className="absolute -right-16 -top-32 -z-10 size-80 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.17),transparent_68%)]" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Your resource library</p><h1 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.055em] sm:text-5xl">Bring your study materials together.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">Add a file once. Find it again when you’re ready to learn.</p></div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/10 bg-emerald-200/[0.06] px-3 py-2 text-xs font-medium text-emerald-100"><ShieldCheck size={15} /> Private to your workspace</div>
        </div>
      </header>

      {validationErrors.length > 0 && <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm text-red-200"><p className="font-medium">Some files were not accepted</p><ul className="mt-2 text-xs"><li>{validationErrors.join("\n")}</li></ul></div>}
      {organizeNotice && <div role="status" className="mt-4 rounded-xl border border-emerald-200/15 bg-emerald-200/[0.06] px-4 py-3 text-sm text-emerald-100">{organizeNotice}</div>}

      {needsOrganization.length > 0 && <section className="mt-5 overflow-hidden rounded-[26px] border border-violet-200/15 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.12),transparent_45%),#141418] p-4 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-violet-100"><span className="grid size-9 place-items-center rounded-xl bg-violet-200/10"><Tag size={17} /></span><p className="text-xs font-semibold uppercase tracking-[0.16em]">Your upload, your structure</p></div><h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">Where should these files live?</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-400">Select files, add their course details, and Zohra will create any folders that are missing. Choose several files to place them together.</p></div><Link href="/resources/courses" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-neutral-200 transition hover:bg-white/[0.06]"><FolderTree size={15} /> Manage folders</Link></div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
          <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">Choose files for this folder</h3><p className="mt-1 text-xs text-neutral-500">{selectedOrganizationIds.length} selected · select another group for a different subject</p></div><button type="button" onClick={() => setSelectedOrganizationIds(selectedOrganizationIds.length === needsOrganization.length ? [] : needsOrganization.map((resource) => resource.id).slice(0, 50))} className="min-h-9 rounded-lg px-2.5 text-xs font-medium text-violet-200 hover:bg-white/[0.06]">{selectedOrganizationIds.length === needsOrganization.length ? "Clear selection" : "Select all"}</button></div><ul className="mt-3 max-h-64 divide-y divide-white/[0.06] overflow-auto">{needsOrganization.map((resource) => <li key={resource.id}><label className="flex min-w-0 cursor-pointer items-center gap-3 py-3"><input type="checkbox" checked={selectedOrganizationIds.includes(resource.id)} onChange={() => toggleOrganizationSelection(resource.id)} className="size-4 shrink-0 accent-violet-300" /><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-neutral-300"><FileText size={16} /></span><span className="min-w-0 flex-1"><span className="block break-words text-sm text-neutral-200">{resource.originalName}</span><span className="mt-0.5 block text-[11px] text-neutral-500">{formatSize(resource.sizeBytes)} · {resource.organizationStatus === "PROCESSING" ? "Checking file…" : "Ready to organize"}</span></span></label></li>)}</ul><p className="mt-3 text-[11px] leading-5 text-neutral-500">Tip: select only the Web Technology files, organize them, then select another group and give it a different subject.</p></div>

          <form onSubmit={organizeSelected} className="min-w-0 space-y-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:p-4"><div><h3 className="text-sm font-semibold">Tell Zohra where they belong</h3><p className="mt-1 text-xs leading-5 text-neutral-500">Existing folders are reused. New names create folders automatically.</p></div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-neutral-300">Academic year<input required list="study-year-options" value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} placeholder="2026–27" maxLength={80} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-violet-300/60" /><datalist id="study-year-options">{years.map((year) => <option key={year.id} value={year.label} />)}</datalist></label>
              <label className="text-xs font-medium text-neutral-300">Semester<input required list="semester-options" value={semester} onChange={(event) => setSemester(event.target.value)} placeholder="Semester 1" maxLength={80} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-violet-300/60" /><datalist id="semester-options">{years.flatMap((year) => year.semesters.map((item) => <option key={item.id} value={item.name} />))}</datalist></label>
              <label className="text-xs font-medium text-neutral-300">Subject<input required list="subject-options" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Web Technology" maxLength={120} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-violet-300/60" /><datalist id="subject-options">{years.flatMap((year) => year.semesters.flatMap((item) => item.subjects.map((entry) => <option key={entry.id} value={entry.name} />)))}</datalist></label>
              <label className="text-xs font-medium text-neutral-300">Unit or chapter <span className="font-normal text-neutral-500">(optional)</span><input list="unit-options" value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="Unit 1" maxLength={140} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-violet-300/60" /><datalist id="unit-options">{years.flatMap((year) => year.semesters.flatMap((item) => item.subjects.flatMap((entry) => entry.chapters.map((chapter) => <option key={chapter.id} value={chapter.name} />))))}</datalist></label></div>
            <div><label htmlFor="upload-tags" className="text-xs font-medium text-neutral-300">Topics or tags <span className="font-normal text-neutral-500">(optional)</span></label><div className="mt-1.5 flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-2.5 py-2 focus-within:border-violet-300/60">{tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-violet-200/10 px-2 py-1 text-xs text-violet-100">#{tag}<button type="button" aria-label={`Remove ${tag} tag`} onClick={() => setTags((current) => current.filter((value) => value !== tag))} className="ml-0.5 text-violet-200/70 hover:text-white">×</button></span>)}<input id="upload-tags" value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(); } }} placeholder={tags.length ? "Add another…" : "e.g. HTML, CSS, lecture notes"} className="min-w-[120px] flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-neutral-600" /><button type="button" onClick={() => addTag()} disabled={!tagDraft.trim()} className="rounded-lg px-2 py-1 text-xs font-medium text-violet-200 hover:bg-white/[0.06] disabled:opacity-40">Add</button></div><p className="mt-1 text-[11px] leading-5 text-neutral-500">Press Enter or comma after each tag. Tags are saved on every selected file.</p></div>
            <div className="rounded-xl border border-violet-200/10 bg-violet-200/[0.04] px-3 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200">Folder preview</p><p className="mt-1 break-words text-sm text-neutral-200">{[academicYear || "Academic year", semester || "Semester", subject || "Subject", unit].filter(Boolean).join(" → ")}</p><p className="mt-1 text-[11px] text-neutral-500">{selectedFileNames.length > 0 ? `${selectedFileNames.length} selected file${selectedFileNames.length === 1 ? "" : "s"} will be placed here.` : "Select at least one uploaded file."}</p></div>
            <button disabled={organizing || selectedOrganizationIds.length === 0 || !academicYear.trim() || !semester.trim() || !subject.trim()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-45"><FolderTree size={16} />{organizing ? "Creating folders and organizing…" : `Create folders & organize ${selectedOrganizationIds.length || "selected"} file${selectedOrganizationIds.length === 1 ? "" : "s"}`}</button>
            <button type="button" disabled={organizing || selectedOrganizationIds.length === 0} onClick={() => void skipTagging()} className="min-h-10 w-full rounded-xl px-3 text-xs text-neutral-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40">Skip tags and try matching file names instead</button>
          </form>
        </div>
      </section>}

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(250px,0.7fr)] lg:gap-4">
        <section
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
          className={`relative grid min-h-[280px] place-items-center overflow-hidden rounded-[26px] border px-5 py-8 text-center transition sm:min-h-[340px] sm:px-10 ${dragging ? "border-violet-200 bg-violet-200/[0.08]" : "border-white/[0.09] bg-gradient-to-br from-[#19191f] to-[#111114]"}`}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="w-full max-w-md">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-violet-100/15 bg-violet-100/[0.08] text-violet-100 shadow-[0_10px_40px_rgba(139,92,246,0.1)] sm:size-16"><UploadCloud size={25} strokeWidth={1.7} /></div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight sm:text-2xl">{dragging ? "Drop to add to your library" : "Start with a file"}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-400">Drag files into this space, or browse your device to choose what you need.</p>
            <input ref={inputRef} onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} type="file" accept={acceptedTypes} multiple className="hidden" />
            <button onClick={() => inputRef.current?.click()} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-white px-6 text-sm font-semibold text-zinc-950 shadow-[0_10px_30px_rgba(255,255,255,0.09)] transition hover:bg-violet-100 sm:w-auto"><UploadCloud size={17} /> Choose files</button>
            <p className="mt-4 text-[11px] text-neutral-500">Select more than one file if you like</p>
          </div>
        </section>

        <aside className="flex flex-col justify-between rounded-[26px] border border-white/[0.08] bg-[#141518] p-4 sm:p-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">A few helpful details</p><h2 className="mt-2 text-lg font-semibold">Ready when you are.</h2>
            <div className="mt-4 space-y-2">
              {[{ icon: FileText, label: "Documents & notes", detail: "PDF, Word, text, Markdown" }, { icon: Sparkles, label: "Slides & images", detail: "PowerPoint, JPG, PNG" }, { icon: UploadCloud, label: "Video lessons", detail: "MP4, MOV, WEBM" }].map(({ icon: Icon, label, detail }) => <div key={label} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-black/20 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-neutral-200"><Icon size={17} /></span><span className="min-w-0"><span className="block text-sm font-medium text-neutral-200">{label}</span><span className="mt-0.5 block truncate text-[11px] text-neutral-500">{detail}</span></span></div>)}
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 border-t border-white/[0.07] pt-4 text-xs text-neutral-400"><ShieldCheck size={15} className="shrink-0 text-emerald-200" /> Files up to 100 MB each</p>
        </aside>
      </div>

      {items.length > 0 && (
        <section className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 sm:p-5">
          <div className="flex flex-col items-stretch justify-between gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Next step</p><h2 className="mt-1 font-semibold">Your upload queue <span className="ml-1 text-xs font-normal text-neutral-500">{items.length} file{items.length === 1 ? "" : "s"}</span></h2></div>{readyCount > 0 && <button onClick={uploadFiles} className="min-h-11 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200">Upload {readyCount} file{readyCount > 1 ? 's' : ''}</button>}</div>
          <ul className="divide-y divide-zinc-800">
            {items.map((item) => <li key={item.id} className="min-w-0 py-3 sm:py-4"><div className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-800 text-neutral-200"><FileText size={20} /></div><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><div className="break-all text-sm font-medium">{item.file.name}</div><div className="text-xs text-neutral-400">{fileType(item.file)} • {formatSize(item.file.size)}</div></div><div className="text-right text-xs text-neutral-400">{item.uploadedAt ? formatModifiedDate(new Date(item.uploadedAt).valueOf()) : formatModifiedDate(item.file.lastModified)}</div></div>{item.status !== 'ready' && <UploadFlow item={item} />}</div><div className="ml-3 flex shrink-0 items-center gap-2"><button onClick={() => removeFile(item.id)} className="grid size-9 place-items-center rounded-md bg-zinc-800 p-2 text-neutral-300 hover:bg-white/5"><X size={14} /></button></div></div></li>) }
          </ul>
        </section>
      )}

      <section className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">In your library</p><h2 className="mt-1 font-semibold">Recently added</h2></div><span className="text-xs text-neutral-500">{savedResources.length} file{savedResources.length === 1 ? "" : "s"}</span></div>
        <ul className="mt-3 divide-y divide-zinc-800 border-t border-zinc-800">
          {isLoadingResources && Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="flex min-w-0 items-center gap-2 py-3.5 sm:gap-3">
                <Skeleton className="size-11 shrink-0 rounded-xl bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/5 rounded bg-zinc-800" />
                  <Skeleton className="h-3 w-1/4 rounded bg-zinc-800/70" />
                </div>
                <Skeleton className="hidden h-3 w-24 rounded bg-zinc-800/70 sm:block" />
                <Skeleton className="size-9 rounded-lg bg-zinc-800/70" />
              </li>
            ))}
          {!isLoadingResources && savedResources.map((resource) => {
            const status = resourceStatus(resource);
            return <li key={resource.id} className="flex min-w-0 items-center gap-2 py-3.5 sm:gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-800 text-neutral-200"><FileText size={20} /></div><div className="min-w-0 flex-1"><div className="break-all text-sm font-medium">{resource.originalName}</div><div className="text-xs text-neutral-400">{resource.mimeType} • {formatSize(resource.sizeBytes)}</div>{(resource.subject || resource.tags?.length) && <div className="mt-1 flex flex-wrap gap-1.5">{resource.subject && <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] text-neutral-300">{[resource.semester?.name, resource.subject.name, resource.chapter?.name].filter(Boolean).join(" · ")}</span>}{resource.tags?.map((tag) => <span key={tag} className="rounded-md bg-violet-200/[0.08] px-2 py-0.5 text-[10px] text-violet-200">#{tag}</span>)}</div>}</div><div className="ml-3 flex shrink-0 items-center gap-2"><div className={`text-xs rounded-md px-2 py-1 ${status.complete ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-neutral-300'}`}>{status.label}</div><button onClick={() => deleteResource(resource.id)} aria-label={`Delete ${resource.originalName}`} className="ml-2 grid size-9 place-items-center rounded-md bg-zinc-800 p-2 text-neutral-300 hover:bg-white/5">{deletingResourceId === resource.id ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}</button></div></li>
          })}
          {!isLoadingResources && savedResources.length === 0 && <li className="py-8 text-center text-sm text-neutral-500">Your uploaded learning materials will appear here.</li>}
        </ul>
      </section>
    </div>
  );
}

"use client";

import {
  CheckCircle2,
  Database,
  FileText,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  createdAt: string;
};

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
  if (resource.status === "READY") return { label: "Added to library", complete: true };
  if (resource.status === "FAILED") return { label: "Upload failed", complete: false };
  return { label: resource.status === "PROCESSING" ? "Processing..." : "Finalizing upload...", complete: false };
}


export default function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [savedResources, setSavedResources] = useState<SavedResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function loadResources() {
      try {
        const response = await fetch("/api/resources");
        const payload = await response.json();
        if (response.ok && active) setSavedResources(payload.resources);
      } finally {
        if (active) setIsLoadingResources(false);
      }
    }

    void loadResources();
    return () => { active = false; };
  }, []);

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
          createdAt: payload.resource.createdAt,
        }, ...current]);
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
            {items.map((item) => <li key={item.id} className="py-4"><div className="flex items-center gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-800 text-neutral-200"><FileText size={20} /></div><div className="flex-1"><div className="flex items-center justify-between"><div><div className="text-sm font-medium">{item.file.name}</div><div className="text-xs text-neutral-400">{fileType(item.file)} • {formatSize(item.file.size)}</div></div><div className="text-right text-xs text-neutral-400">{item.uploadedAt ? formatModifiedDate(new Date(item.uploadedAt).valueOf()) : formatModifiedDate(item.file.lastModified)}</div></div>{item.status !== 'ready' && <UploadFlow item={item} />}</div><div className="ml-3 flex shrink-0 items-center gap-2"><button onClick={() => removeFile(item.id)} className="grid size-9 place-items-center rounded-md bg-zinc-800 p-2 text-neutral-300 hover:bg-white/5"><X size={14} /></button></div></div></li>) }
          </ul>
        </section>
      )}

      <section className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">In your library</p><h2 className="mt-1 font-semibold">Recently added</h2></div><span className="text-xs text-neutral-500">{savedResources.length} file{savedResources.length === 1 ? "" : "s"}</span></div>
        <ul className="mt-3 divide-y divide-zinc-800 border-t border-zinc-800">
          {isLoadingResources && Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="flex items-center gap-3 py-3.5">
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
            return <li key={resource.id} className="flex items-center gap-3 py-3.5"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-800 text-neutral-200"><FileText size={20} /></div><div className="flex-1"><div className="text-sm font-medium">{resource.originalName}</div><div className="text-xs text-neutral-400">{resource.mimeType} • {formatSize(resource.sizeBytes)}</div></div><div className="ml-3 flex shrink-0 items-center gap-2"><div className={`text-xs rounded-md px-2 py-1 ${status.complete ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-neutral-300'}`}>{status.label}</div><button onClick={() => deleteResource(resource.id)} className="ml-2 grid size-9 place-items-center rounded-md bg-zinc-800 p-2 text-neutral-300 hover:bg-white/5">{deletingResourceId === resource.id ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}</button></div></li>
          })}
          {!isLoadingResources && savedResources.length === 0 && <li className="py-8 text-center text-sm text-neutral-500">Your uploaded learning materials will appear here.</li>}
        </ul>
      </section>
    </div>
  );
}

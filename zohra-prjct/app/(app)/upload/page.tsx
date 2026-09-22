"use client";

import {
  CheckCircle2,
  Database,
  FileText,
  LoaderCircle,
  Paperclip,
  ShieldCheck,
  Sparkles,
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
  { id: "validating", label: "Validating file", icon: ShieldCheck },
  { id: "creating-resource", label: "Creating resource record", icon: Database },
  { id: "authorizing-upload", label: "Securing upload", icon: ShieldCheck },
  { id: "uploading-to-blob", label: "Uploading to Blob", icon: UploadCloud },
] as const;

const phaseOrder = Object.fromEntries(uploadSteps.map((step, index) => [step.id, index]));

function UploadFlow({ item }: { item: UploadItem }) {
  const currentStep = item.phase === "complete" ? uploadSteps.length : phaseOrder[item.phase ?? "validating"] ?? 0;
  const nodePositions = [
    "left-1/2 top-0 -translate-x-1/2",
    "left-0 top-1/2 -translate-y-1/2",
    "right-0 top-1/2 -translate-y-1/2",
    "bottom-0 left-1/2 -translate-x-1/2",
  ];

  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 px-5 py-5 sm:px-8">
      <div className="relative mx-auto h-[238px] max-w-[460px]">
        <svg viewBox="0 0 460 238" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
          {[
            [230, 31, 56, 119],
            [56, 119, 404, 119],
            [404, 119, 230, 207],
          ].map(([x1, y1, x2, y2], index) => (
            <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5" className={`${currentStep > index ? "text-emerald-400" : "text-zinc-700"} transition-colors duration-500`} />
          ))}
        </svg>
        {uploadSteps.map((step, index) => {
          const Icon = step.icon;
          const isComplete = currentStep > index;
          const isActive = currentStep === index && item.status === "uploading";
          return (
            <div key={step.id} className={`absolute ${nodePositions[index]} flex w-28 flex-col items-center text-center`}>
              <div className={`${isComplete ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-400" : isActive ? "border-white bg-white text-black shadow-[0_0_0_5px_rgba(255,255,255,0.08)]" : "border-zinc-700 bg-zinc-900 text-neutral-500"} grid size-[62px] place-items-center rounded-2xl border transition-all duration-500 ${isActive ? "scale-110" : ""}`}>
                {isComplete ? <CheckCircle2 size={24} /> : isActive ? <LoaderCircle size={23} className="animate-spin" /> : <Icon size={22} />}
              </div>
              <p className={`${isActive || isComplete ? "text-neutral-200" : "text-neutral-500"} mt-2 text-[11px] font-medium leading-tight transition-colors`}>{step.label}</p>
              {isActive && step.id === "uploading-to-blob" && <p className="mt-1 text-[10px] text-neutral-500">{item.progress ?? 0}% complete</p>}
            </div>
          );
        })}
      </div>
      {item.status === "complete" && <p className="mt-3 border-t border-zinc-800 pt-3 text-xs text-emerald-400">File uploaded securely and added to your resource library.</p>}
    </div>
  );
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
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

  function addFiles(files: FileList | File[]) {
    const rejected: string[] = [];
    const incoming = Array.from(files).flatMap((file) => {
      const error = validateResourceFile(file);
      if (error) {
        rejected.push(`${file.name}: ${error}`);
        return [];
      }
      return [{
        id: crypto.randomUUID(),
        resourceId: "",
        userId: "",
        storageKey: "",
        uploadedAt: null,
        file,
        status: "ready" as const,
      }];
    });
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
          body: JSON.stringify({ name: item.file.name, type: item.file.type, size: item.file.size }),
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

  const readyCount = items.filter((item) => item.status === "ready").length;

  return (
    <div className="mx-auto max-w-6xl pb-8 text-white">
      <section>
        <p className="text-sm font-medium text-neutral-400">Resource library</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Upload your learning materials</h1>
        <p className="mt-3 text-base text-neutral-400">Add notes, PDFs, documents, presentations, or videos to keep everything together.</p>
      </section>

      {validationErrors.length > 0 && <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm text-red-200"><p className="font-medium">Some files were not added</p><ul className="mt-1 list-disc space-y-1 pl-5 text-red-200/80">{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul></div>}

      <section
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
        className={`mt-8 grid min-h-[374px] place-items-center rounded-2xl border border-dashed px-6 py-12 text-center transition sm:px-10 ${dragging ? "border-white bg-white/[0.07]" : "border-zinc-600 bg-zinc-900/20 hover:border-zinc-400"}`}
      >
        <div>
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-zinc-800/80 text-white shadow-[inset_0_1px_rgba(255,255,255,0.06)]"><UploadCloud size={35} strokeWidth={1.8} /></div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">Drop your files here</h2>
          <p className="mt-2 text-sm text-neutral-400">or choose files from your device</p>
          <input ref={inputRef} onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} type="file" accept={acceptedTypes} multiple className="hidden" />
          <button onClick={() => inputRef.current?.click()} className="mt-6 inline-flex h-12 items-center gap-3 rounded-xl bg-white px-7 text-sm font-semibold text-black shadow-sm transition hover:bg-neutral-200"><Paperclip size={19} strokeWidth={2.2} />Browse files</button>
          <p className="mt-6 text-xs leading-6 text-neutral-400">Supported: PDF, DOCX, PPTX, TXT, MD, JPG, PNG, MP4, MOV, WEBM<br />(Max size: 100 MB per file)</p>
        </div>
      </section>

      <div className="mt-9 flex items-center gap-5 text-center before:h-px before:flex-1 before:bg-zinc-800 after:h-px after:flex-1 after:bg-zinc-800">
        <div className="shrink-0"><p className="flex items-center justify-center gap-2 text-sm font-medium"><Sparkles size={17} fill="currentColor" />Zohra handles the rest</p><p className="mt-1 text-sm text-neutral-400">Your files will be organized automatically.</p></div>
      </div>

      {items.length > 0 && (
        <section className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4"><h2 className="font-semibold">Upload queue</h2>{readyCount > 0 && <button onClick={uploadFiles} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200">Upload {readyCount} file{readyCount === 1 ? "" : "s"}</button>}</div>
          <ul className="divide-y divide-zinc-800">
            {items.map((item) => <li key={item.id} className="py-4"><div className="flex items-center gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-800 text-neutral-200"><FileText size={21} /></div><div className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-medium">{item.file.name}</p><p className="mt-1 text-xs text-neutral-400">{formatSize(item.file.size)}</p></div>{item.status === "uploading" && <span className="flex items-center gap-2 text-sm text-neutral-400"><LoaderCircle size={17} className="animate-spin" />Processing</span>}{item.status === "complete" && <span className="flex items-center gap-2 text-sm text-neutral-300"><CheckCircle2 size={19} />Added to library</span>}{item.status === "error" && <span className="max-w-48 truncate text-sm text-red-300" title={item.error}>{item.error}</span>}{item.status === "ready" && <button onClick={() => removeFile(item.id)} aria-label={`Remove ${item.file.name}`} className="grid size-9 place-items-center rounded-lg text-neutral-400 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>}</div>{item.phase && <UploadFlow item={item} />}<div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800 sm:grid-cols-4">{[{ label: "File name", value: item.file.name }, { label: "Size", value: formatSize(item.file.size) }, { label: "Type", value: fileType(item.file) }, { label: "Modified", value: formatModifiedDate(item.file.lastModified) }].map((metadata) => <div key={metadata.label} className="min-w-0 bg-zinc-950/60 px-3 py-3"><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">{metadata.label}</p><p title={metadata.value} className="mt-1.5 truncate text-xs text-neutral-300">{metadata.value}</p></div>)}</div></li>)}
          </ul>
        </section>
      )}

      <section className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 sm:p-5">
        <h2 className="font-semibold">Recently added</h2>
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
            return <li key={resource.id} className="flex items-center gap-3 py-3.5"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-800 text-neutral-200"><FileText size={21} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{resource.originalName}</p><p className="mt-1 text-xs text-neutral-400">{formatSize(resource.sizeBytes)} · {formatModifiedDate(new Date(resource.createdAt).getTime())}</p></div><span className={`${status.complete ? "text-neutral-300" : resource.status === "FAILED" ? "text-red-300" : "text-neutral-400"} hidden items-center gap-2 text-sm sm:flex`}>{status.complete ? <CheckCircle2 size={19} /> : <LoaderCircle size={17} className={resource.status === "FAILED" ? "" : "animate-spin"} />}{status.label}</span></li>;
          })}
          {!isLoadingResources && savedResources.length === 0 && <li className="py-8 text-center text-sm text-neutral-500">Your uploaded learning materials will appear here.</li>}
        </ul>
      </section>
    </div>
  );
}

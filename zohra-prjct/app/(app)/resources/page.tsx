"use client";

import Link from "next/link";
import {
  BookOpenText,
  Clock3,
  FileText,
  Filter,
  FolderOpen,
  Grid2X2,
  LayoutList,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Presentation,
  ShieldAlert,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type Resource = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  textExtractionStatus: "NOT_STARTED" | "EXTRACTING" | "EXTRACTED" | "NO_TEXT" | "FAILED" | "NOT_APPLICABLE";
  pageCount: number | null;
  createdAt: string;
};

type ExtractedText = Pick<Resource, "id" | "originalName" | "textExtractionStatus" | "pageCount"> & {
  extractedText: string | null;
  extractedTextLength: number | null;
  extractionError: string | null;
};

type ResourceTab = "subjects" | "all" | "recent" | "review";
type ResourceFilter = "all" | "document" | "presentation" | "video" | "other";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resourceKind(resource: Resource): Exclude<ResourceFilter, "all"> {
  if (resource.mimeType.startsWith("video/")) return "video";
  if (
    resource.mimeType.includes("presentation") ||
    resource.mimeType.includes("powerpoint")
  )
    return "presentation";
  if (
    resource.mimeType.includes("pdf") ||
    resource.mimeType.includes("word") ||
    resource.mimeType.startsWith("text/")
  )
    return "document";
  return "other";
}

function typeLabel(resource: Resource) {
  const kind = resourceKind(resource);
  if (kind === "presentation") return "PPTX";
  if (kind === "video") return "VIDEO";
  if (resource.mimeType === "application/pdf") return "PDF";
  if (resource.mimeType.includes("word")) return "DOCX";
  if (resource.mimeType === "text/markdown") return "MD";
  if (resource.mimeType === "text/plain") return "TXT";
  return "FILE";
}

function formatAdded(date: string) {
  const timestamp = new Date(date).getTime();
  const difference = Date.now() - timestamp;
  const hours = Math.floor(difference / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function CollectionIcon({ kind }: { kind: Exclude<ResourceFilter, "all"> }) {
  const Icon =
    kind === "presentation"
      ? Presentation
      : kind === "video"
        ? Video
        : kind === "document"
          ? FileText
          : FolderOpen;
  return <Icon size={22} />;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ResourceTab>("subjects");
  const [filter, setFilter] = useState<ResourceFilter>("all");
  const [isGrid, setIsGrid] = useState(true);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(
    null,
  );
  const [isTextViewerOpen, setIsTextViewerOpen] = useState(false);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [extractedText, setExtractedText] = useState<ExtractedText | null>(null);

  useEffect(() => {
    let active = true;
    async function loadResources() {
      try {
        const response = await fetch("/api/resources");
        const payload = await response.json();
        if (response.ok && active) setResources(payload.resources);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadResources();
    return () => {
      active = false;
    };
  }, []);

  const filteredResources = useMemo(
    () =>
      resources.filter((resource) => {
        if (activeTab === "review" && resource.status === "READY") return false;
        return filter === "all" || resourceKind(resource) === filter;
      }),
    [activeTab, filter, resources],
  );

  const collections = useMemo(
    () =>
      (["document", "presentation", "video", "other"] as const).map((kind) => {
        const matching = resources.filter(
          (resource) => resourceKind(resource) === kind,
        );
        const labels = {
          document: ["Documents", "DOCS"],
          presentation: ["Presentations", "SLIDES"],
          video: ["Video lessons", "VIDEO"],
          other: ["Other materials", "FILES"],
        } as const;
        return {
          kind,
          name: labels[kind][0],
          code: labels[kind][1],
          count: matching.length,
          latest: matching[0]?.createdAt,
        };
      }),
    [resources],
  );

  async function deleteResource(resourceId: string) {
    setDeletingResourceId(resourceId);
    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Unable to remove resource.");
      setResources((current) =>
        current.filter((resource) => resource.id !== resourceId),
      );
    } finally {
      setDeletingResourceId(null);
    }
  }

  async function viewExtractedText(resourceId: string) {
    setIsTextViewerOpen(true);
    setIsLoadingText(true);
    setExtractedText(null);
    try {
      const response = await fetch(`/api/resources/${resourceId}/text`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load extracted text.");
      setExtractedText(payload.resource);
    } finally {
      setIsLoadingText(false);
    }
  }

  async function extractText(resourceId: string) {
    setIsExtractingText(true);
    try {
      const response = await fetch(`/api/resources/${resourceId}/extract`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to extract PDF text.");
      await viewExtractedText(resourceId);
      setResources((current) => current.map((resource) => resource.id === resourceId ? { ...resource, textExtractionStatus: "EXTRACTED" } : resource));
    } finally {
      setIsExtractingText(false);
    }
  }

  const tabs: { id: ResourceTab; label: string; icon: typeof FolderOpen }[] = [
    { id: "subjects", label: "Subjects", icon: FolderOpen },
    { id: "all", label: "All resources", icon: FileText },
    { id: "recent", label: "Recently added", icon: Clock3 },
    { id: "review", label: "Needs review", icon: ShieldAlert },
  ];

  return (
    <div className="mx-auto max-w-[1440px] pb-8 text-white">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="font-serif text-4xl font-medium tracking-[-0.055em] sm:text-6xl">
            Resources
          </h1>
          <p className="mt-2 text-base text-neutral-400 sm:text-lg">
            All your study materials, organized around what you&apos;re
            learning.
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex h-10 items-center gap-3 rounded-xl bg-white px-4 text-sm font-semibold text-black shadow-sm transition hover:bg-neutral-200"
        >
          <Upload size={15} />
          Add resources
        </Link>
      </header>

      <nav className="mt-7 flex flex-wrap items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/30 p-1.5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`${activeTab === id ? "bg-white text-black shadow-sm" : "text-neutral-400 hover:bg-white/10 hover:text-white"} inline-flex h-11 items-center gap-3 rounded-lg px-5 text-sm font-medium transition`}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
        <div className="ml-auto hidden h-11 items-center gap-2 rounded-lg border border-zinc-800 px-3 text-sm text-neutral-300 sm:flex">
          <Filter size={18} />
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as ResourceFilter)
            }
            className="cursor-pointer bg-transparent pr-1 outline-none"
          >
            <option value="all">Filter</option>
            <option value="document">Documents</option>
            <option value="presentation">Presentations</option>
            <option value="video">Videos</option>
            <option value="other">Other</option>
          </select>
        </div>
      </nav>

      {(activeTab === "subjects" || activeTab === "all") && (
        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">
              {activeTab === "subjects" ? "Your subjects" : "All resources"}
            </h2>
            <div className="flex items-center gap-3 text-sm text-neutral-400">
              <span className="hidden sm:inline">Sort by: Name</span>
              <div className="flex rounded-lg border border-zinc-800 p-1">
                <button
                  onClick={() => setIsGrid(true)}
                  aria-label="Grid view"
                  className={`${isGrid ? "bg-zinc-800 text-white" : "text-neutral-500"} grid size-8 place-items-center rounded`}
                >
                  <Grid2X2 size={18} />
                </button>
                <button
                  onClick={() => setIsGrid(false)}
                  aria-label="List view"
                  className={`${!isGrid ? "bg-zinc-800 text-white" : "text-neutral-500"} grid size-8 place-items-center rounded`}
                >
                  <LayoutList size={18} />
                </button>
              </div>
            </div>
          </div>
          {activeTab === "subjects" && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-56 rounded-2xl bg-zinc-900"
                    />
                  ))
                : collections.map((collection) => (
                    <article
                      key={collection.kind}
                      className="group min-h-56 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-5 transition hover:border-zinc-600 hover:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between">
                        <div className="grid size-13 place-items-center rounded-xl bg-zinc-800 text-neutral-100">
                          <CollectionIcon kind={collection.kind} />
                        </div>
                        <MoreHorizontal
                          size={20}
                          className="text-neutral-500"
                        />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold">
                        {collection.name}
                      </h3>
                      <p className="mt-1 text-sm text-neutral-400">
                        {collection.code}
                      </p>
                      <p className="mt-2 text-sm text-neutral-200">
                        {collection.count} resource
                        {collection.count === 1 ? "" : "s"}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-sm text-neutral-500">
                        <span>
                          {collection.latest
                            ? `Updated ${formatAdded(collection.latest)}`
                            : "No files yet"}
                        </span>
                        <span className="grid size-10 place-items-center rounded-full bg-zinc-800 text-neutral-200 transition group-hover:bg-white group-hover:text-black">
                          →
                        </span>
                      </div>
                    </article>
                  ))}
            </div>
          )}
          {activeTab === "all" && (
            <ResourceGrid
              resources={filteredResources}
              isLoading={isLoading}
              isGrid={isGrid}
              onDelete={deleteResource}
              deletingResourceId={deletingResourceId}
            />
          )}
          {activeTab === "subjects" && (
            <Link
              href="/upload"
              className="mt-4 flex min-h-16 max-w-sm items-center gap-4 rounded-xl border border-zinc-700 px-6 text-sm transition hover:border-zinc-500 hover:bg-white/[0.03]"
            >
              <Plus size={25} />
              <span>
                <span className="block font-medium">Add resources</span>
                <span className="mt-1 block text-xs text-neutral-500">
                  Upload a new learning material
                </span>
              </span>
            </Link>
          )}
        </section>
      )}

      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {activeTab === "review" ? "Needs review" : "Recently added"}
          </h2>
          {activeTab === "subjects" && (
            <button
              onClick={() => setActiveTab("recent")}
              className="text-sm text-neutral-300 transition hover:text-white"
            >
              View all&nbsp; →
            </button>
          )}
        </div>
        <ResourceTable
          resources={activeTab === "review" ? filteredResources : resources}
          isLoading={isLoading}
          onDelete={deleteResource}
          onViewText={viewExtractedText}
          deletingResourceId={deletingResourceId}
        />
      </section>
      {isTextViewerOpen && <ExtractedTextViewer resource={extractedText} isLoading={isLoadingText} isExtracting={isExtractingText} onExtract={extractText} onClose={() => setIsTextViewerOpen(false)} />}
    </div>
  );
}

function ResourceGrid({
  resources,
  isLoading,
  isGrid,
  onDelete,
  deletingResourceId,
}: {
  resources: Resource[];
  isLoading: boolean;
  isGrid: boolean;
  onDelete: (id: string) => void;
  deletingResourceId: string | null;
}) {
  if (isLoading)
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl bg-zinc-900" />
        ))}
      </div>
    );
  if (!resources.length) return <EmptyResources />;
  return (
    <div
      className={
        isGrid ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-2"
      }
    >
      {resources.map((resource) => (
        <article
          key={resource.id}
          className={`${isGrid ? "min-h-40 p-5" : "flex items-center gap-4 p-4"} rounded-2xl border border-zinc-800 bg-zinc-900/45`}
        >
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-800 text-neutral-200">
            <FileText size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{resource.originalName}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {typeLabel(resource)} · {formatSize(resource.sizeBytes)}
            </p>
          </div>
          <button
            onClick={() => onDelete(resource.id)}
            disabled={deletingResourceId === resource.id}
            aria-label={`Remove ${resource.originalName}`}
            className="grid size-9 place-items-center rounded-lg text-neutral-500 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
          >
            {deletingResourceId === resource.id ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Trash2 size={17} />
            )}
          </button>
        </article>
      ))}
    </div>
  );
}

function ResourceTable({
  resources,
  isLoading,
  onDelete,
  onViewText,
  deletingResourceId,
}: {
  resources: Resource[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onViewText: (id: string) => void;
  deletingResourceId: string | null;
}) {
  if (isLoading)
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-5 space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-12 w-full rounded-lg bg-zinc-800/80"
          />
        ))}
      </div>
    );
  if (!resources.length) return <EmptyResources />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/45">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="border-b border-zinc-800 text-neutral-400">
          <tr>
            <th className="px-6 py-3 font-medium">Name</th>
            <th className="px-6 py-3 font-medium">Collection</th>
            <th className="px-6 py-3 font-medium">Type</th>
            <th className="px-6 py-3 font-medium">Added</th>
            <th className="w-24 px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {resources.map((resource) => (
            <tr key={resource.id} className="group">
              <td className="px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-zinc-800 text-neutral-200">
                    <FileText size={18} />
                  </div>
                  <span className="max-w-56 truncate font-medium">
                    {resource.originalName}
                  </span>
                </div>
              </td>
              <td className="px-6 py-3">
                <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-neutral-300">
                  {resourceKind(resource)}
                </span>
              </td>
              <td className="px-6 py-3 text-neutral-300">
                {typeLabel(resource)}
              </td>
              <td className="px-6 py-3 text-neutral-400">
                {formatAdded(resource.createdAt)}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-1">
                  {resource.mimeType === "application/pdf" && <button onClick={() => onViewText(resource.id)} aria-label={`View extracted text for ${resource.originalName}`} className="grid size-9 place-items-center rounded-lg text-neutral-500 transition hover:bg-white/10 hover:text-white"><BookOpenText size={17} /></button>}
                  <button
                    onClick={() => onDelete(resource.id)}
                    disabled={deletingResourceId === resource.id}
                    aria-label={`Remove ${resource.originalName}`}
                    className="grid size-9 place-items-center rounded-lg text-neutral-500 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  >
                    {deletingResourceId === resource.id ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Trash2 size={17} />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExtractedTextViewer({ resource, isLoading, isExtracting, onExtract, onClose }: { resource: ExtractedText | null; isLoading: boolean; isExtracting: boolean; onExtract: (id: string) => void; onClose: () => void }) {
  const message = resource?.textExtractionStatus === "NO_TEXT" ? "No machine-readable text was found in this PDF. OCR has not been enabled yet." : resource?.textExtractionStatus === "EXTRACTING" ? "Zohra is extracting text from this PDF." : resource?.textExtractionStatus === "FAILED" ? resource.extractionError || "Text extraction failed." : "Text has not been extracted yet.";
  return <div role="dialog" aria-modal="true" aria-label="Extracted PDF text" className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><section className="flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"><header className="flex items-start justify-between border-b border-zinc-800 px-5 py-4"><div><p className="text-sm font-semibold">Extracted text</p><p className="mt-1 text-xs text-neutral-500">{resource?.originalName || "Loading resource..."}{resource?.pageCount ? ` · ${resource.pageCount} pages` : ""}</p></div><button onClick={onClose} aria-label="Close extracted text" className="grid size-9 place-items-center rounded-lg text-neutral-400 transition hover:bg-white/10 hover:text-white"><X size={19} /></button></header><div className="min-h-48 overflow-y-auto p-5">{isLoading ? <div className="space-y-3"><Skeleton className="h-4 w-full bg-zinc-800" /><Skeleton className="h-4 w-11/12 bg-zinc-800" /><Skeleton className="h-4 w-4/5 bg-zinc-800" /></div> : resource?.textExtractionStatus === "EXTRACTED" && resource.extractedText ? <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-neutral-300">{resource.extractedText}</pre> : <div><p className="text-sm leading-6 text-neutral-400">{message}</p>{resource?.textExtractionStatus === "NOT_STARTED" && <button onClick={() => onExtract(resource.id)} disabled={isExtracting} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60">{isExtracting && <LoaderCircle size={16} className="animate-spin" />}{isExtracting ? "Extracting text..." : "Extract text"}</button>}</div>}</div></section></div>;
}

function EmptyResources() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-700 py-14 text-center">
      <FolderOpen className="mx-auto text-neutral-500" size={28} />
      <p className="mt-3 font-medium">No resources here yet</p>
      <p className="mt-1 text-sm text-neutral-500">
        Upload learning material to build your library.
      </p>
    </div>
  );
}

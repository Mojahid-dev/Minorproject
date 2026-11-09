"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Search,
  X,
} from "lucide-react";

type PdfResource = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  pageCount: number | null;
  subject: { id: string; name: string } | null;
  chapter: { id: string; name: string } | null;
  tags: string[];
};

function isPdf(resource: Pick<PdfResource, "mimeType" | "originalName">) {
  return (
    resource.mimeType.toLowerCase() === "application/pdf" ||
    resource.originalName.toLowerCase().endsWith(".pdf")
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FocusStudyMaterial({ sessionId }: { sessionId: string }) {
  const [resources, setResources] = useState<PdfResource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const storageKey = `zohra:focus-pdf:${sessionId}`;

  useEffect(() => {
    const controller = new AbortController();

    async function loadResources() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/resources", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Could not load your PDFs.");
        }

        const available = (
          Array.isArray(payload.resources) ? payload.resources : []
        ).filter(
          (resource: PdfResource) =>
            isPdf(resource) &&
            ["READY", "PROCESSING"].includes(resource.status),
        ) as PdfResource[];

        setResources(available);
        const savedId = window.sessionStorage.getItem(storageKey);
        if (savedId && available.some((resource) => resource.id === savedId)) {
          setSelectedId(savedId);
        } else {
          window.sessionStorage.removeItem(storageKey);
        }
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError")
          return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your PDFs.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadResources();
    return () => controller.abort();
  }, [storageKey]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPickerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickerOpen]);

  const selected =
    resources.find((resource) => resource.id === selectedId) ?? null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return resources;
    return resources.filter((resource) =>
      [
        resource.originalName,
        resource.subject?.name,
        resource.chapter?.name,
        ...resource.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle),
    );
  }, [query, resources]);

  function choosePdf(resource: PdfResource) {
    setSelectedId(resource.id);
    window.sessionStorage.setItem(storageKey, resource.id);
    setPickerOpen(false);
    setQuery("");
  }

  function clearPdf() {
    setSelectedId(null);
    window.sessionStorage.removeItem(storageKey);
  }

  return (
    <>
      {selected ? (
        <section className="flex min-h-[65vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#14151a] lg:h-[calc(100dvh-108px)] lg:min-h-[620px]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-200">
                <FileText size={17} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">
                  {selected.originalName}
                </h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {[
                    selected.subject?.name,
                    selected.chapter?.name,
                    selected.pageCount ? `${selected.pageCount} pages` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Your study document"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-semibold text-neutral-200 transition hover:bg-white/[0.06]"
              >
                <BookOpen size={14} /> Change PDF
              </button>
              <button
                type="button"
                onClick={clearPdf}
                aria-label="Close study PDF"
                className="grid size-9 place-items-center rounded-xl border border-white/10 text-neutral-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={15} />
              </button>
            </div>
          </header>
          <iframe
            key={selected.id}
            title={`Study PDF: ${selected.originalName}`}
            src={`/api/resources/${selected.id}/file#toolbar=1&navpanes=0&view=FitH`}
            className="min-h-[60vh] w-full flex-1 bg-white lg:min-h-0"
          />
          <footer className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-2.5 text-[11px] text-neutral-500 sm:px-5">
            <span>
              PDF is open inside Focus Mode. Your session timer keeps running.
            </span>
            <a
              href={`/api/resources/${selected.id}/file`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 font-medium text-violet-300 hover:text-violet-200"
            >
              Open separately
            </a>
          </footer>
        </section>
      ) : (
        <section className="flex min-h-[360px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#14151a] lg:min-h-[calc(100dvh-108px)]">
          <header className="border-b border-white/[0.08] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-violet-300">
              Study material
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">
              Bring your notes into Focus
            </h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Choose a PDF from your Zohra resources and read it here without
              leaving your session.
            </p>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="grid size-16 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/[0.08] text-violet-200">
              <BookOpen size={27} />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-white">
              Keep your study material close
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-400">
              Open your lecture notes, textbook or question bank alongside the
              timer. Your focus session stays active while you read.
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              <FileText size={16} /> Choose a PDF
            </button>
            <p className="mt-3 text-[11px] text-neutral-600">
              Only PDFs from your private Resources library are shown.
            </p>
          </div>
        </section>
      )}

      {pickerOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPickerOpen(false);
          }}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="focus-pdf-picker-title"
            className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#17181e] shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
              <div>
                <h2
                  id="focus-pdf-picker-title"
                  className="text-base font-semibold text-white"
                >
                  Choose study material
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Select a PDF from your Resources library.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Close PDF picker"
                className="grid size-9 place-items-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white"
              >
                <X size={17} />
              </button>
            </header>

            <div className="border-b border-white/[0.08] p-4">
              <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 focus-within:border-violet-400/60">
                <Search size={16} className="shrink-0 text-neutral-500" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search PDFs by name, subject or chapter..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="text-neutral-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-400">
                  <Loader2 size={17} className="animate-spin" /> Loading your
                  PDFs…
                </div>
              ) : error ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-red-300">{error}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-3 text-xs font-semibold text-violet-300 hover:text-violet-200"
                  >
                    Reload Focus Mode
                  </button>
                </div>
              ) : filtered.length ? (
                <div className="space-y-2">
                  {filtered.map((resource) => {
                    const activeSelection = resource.id === selectedId;
                    return (
                      <button
                        type="button"
                        key={resource.id}
                        onClick={() => choosePdf(resource)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${activeSelection ? "border-violet-400/50 bg-violet-500/[0.10]" : "border-white/[0.07] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]"}`}
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-red-400/10 text-red-200">
                          <FileText size={19} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-neutral-100">
                            {resource.originalName}
                          </span>
                          <span className="mt-1 block truncate text-[11px] text-neutral-500">
                            {[
                              resource.subject?.name,
                              resource.chapter?.name,
                              resource.pageCount
                                ? `${resource.pageCount} pages`
                                : null,
                              formatSize(resource.sizeBytes),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        {activeSelection ? (
                          <Check
                            size={17}
                            className="shrink-0 text-violet-300"
                          />
                        ) : (
                          <ChevronDown
                            size={16}
                            className="shrink-0 -rotate-90 text-neutral-600"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : resources.length ? (
                <div className="py-14 text-center">
                  <Search size={23} className="mx-auto text-neutral-600" />
                  <p className="mt-3 text-sm text-neutral-300">
                    No PDFs match “{query}”.
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Try another file name, subject or chapter.
                  </p>
                </div>
              ) : (
                <div className="py-14 text-center">
                  <FileText size={25} className="mx-auto text-neutral-600" />
                  <p className="mt-3 text-sm font-medium text-neutral-200">
                    No ready PDFs found
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-neutral-500">
                    Upload a PDF to Resources first. Then return here and it
                    will appear in this list.
                  </p>
                  <a
                    href="/resources"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-neutral-200 hover:bg-white/[0.06]"
                  >
                    Open Resources in a new tab
                  </a>
                </div>
              )}
            </div>
            <footer className="flex items-center justify-between border-t border-white/[0.08] px-5 py-3">
              <span className="text-[11px] text-neutral-500">
                {resources.length} PDF{resources.length === 1 ? "" : "s"}{" "}
                available
              </span>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="h-9 rounded-lg border border-white/10 px-4 text-xs font-semibold text-neutral-300 hover:bg-white/[0.06]"
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

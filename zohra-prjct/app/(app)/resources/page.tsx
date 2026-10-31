"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderTree, SearchX, UploadCloud, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useClock } from "@/hooks/use-clock";
import { plural } from "@/lib/dashboard-utils";
import {
  countFolders,
  filterOf,
  formatSize,
  inReviewQueue,
  matchesQuery,
  needsDecision,
  sortResources,
  type FileFilter,
  type Resource,
  type SortKey,
  type StudyYear,
} from "@/lib/resources-view";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InlineError,
  focusRing,
  primaryButton,
  secondaryButton,
} from "@/components/dashboard/shared";
import { CourseBrowser } from "@/components/resources/course-browser";
import { ConfirmDeleteDialog, OrganizerDialog, type Location } from "@/components/resources/dialogs";
import { ResourceList, type RowContext } from "@/components/resources/resource-row";
import { Toolbar } from "@/components/resources/toolbar";
import { cn } from "@/lib/utils";

type Tab = "courses" | "all" | "review";

function parseTab(value: string | null): Tab {
  if (value === "review") return "review";
  // "recent" used to be its own tab; it was the same list as "all", newest first.
  if (value === "all" || value === "recent") return "all";
  return "courses";
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ResourcesContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5" aria-busy="true" aria-label="Loading resources">
      <Skeleton className="h-16 w-72" />
      <Skeleton className="h-11" />
      <Skeleton className="h-72" />
    </div>
  );
}

function ResourcesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = useClock();

  const tab = parseTab(searchParams.get("tab"));
  const folder = searchParams.get("folder");

  const [resources, setResources] = useState<Resource[]>([]);
  const [years, setYears] = useState<StudyYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FileFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const [organizing, setOrganizing] = useState<Resource | null>(null);
  const [organizeError, setOrganizeError] = useState("");
  const [deleting, setDeleting] = useState<Resource | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---- data --------------------------------------------------------------
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [resourceResponse, treeResponse] = await Promise.all([
        fetch("/api/resources", { cache: "no-store" }),
        fetch("/api/study-structure", { cache: "no-store" }),
      ]);
      const [resourcePayload, treePayload] = await Promise.all([
        resourceResponse.json(),
        treeResponse.json(),
      ]);
      if (!resourceResponse.ok)
        throw new Error(resourcePayload.error || "Could not load your resources.");
      if (!treeResponse.ok)
        throw new Error(treePayload.error || "Could not load your course folders.");
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
    const timer = window.setTimeout(() => void loadData(false), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  // Keep polling while anything is still being organised.
  useEffect(() => {
    const waiting = resources.some(
      (resource) =>
        resource.organizationStatus === "PROCESSING" || resource.organizationStatus === "PENDING",
    );
    if (!waiting) return;
    const timer = window.setInterval(() => void loadData(false), 3500);
    return () => window.clearInterval(timer);
  }, [resources, loadData]);

  // ---- navigation (URL is the source of truth for tab + folder) ----------
  const navigate = useCallback(
    (next: { tab?: Tab; folder?: string | null }, mode: "push" | "replace") => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.tab !== undefined) {
        if (next.tab === "courses") params.delete("tab");
        else params.set("tab", next.tab);
      }
      if (next.folder !== undefined) {
        if (next.folder) params.set("folder", next.folder);
        else params.delete("folder");
      }
      const qs = params.toString();
      router[mode](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const topRef = useRef<HTMLDivElement>(null);
  const firstFolderRender = useRef(true);
  useEffect(() => {
    // Opening or leaving a folder swaps the whole view: start at its top.
    if (firstFolderRender.current) {
      firstFolderRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ block: "start" });
  }, [folder]);

  // ---- actions -----------------------------------------------------------
  async function assign(resource: Resource, location: Location) {
    setBusyId(resource.id);
    setOrganizeError("");
    try {
      const response = await fetch(`/api/resources/${resource.id}/organization`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save this course location.");
      setOrganizing(null);
      toast.success(location.subjectId ? "Location saved" : "Moved to Unsorted");
      await loadData(false);
    } catch (error) {
      setOrganizeError(error instanceof Error ? error.message : "Could not save this course location.");
    } finally {
      setBusyId(null);
    }
  }

  async function retry(resource: Resource) {
    setBusyId(resource.id);
    try {
      const response = await fetch(`/api/resources/${resource.id}/process`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not retry organization.");
      setResources((items) =>
        items.map((item) =>
          item.id === resource.id
            ? { ...item, organizationStatus: "PROCESSING", status: "PROCESSING" }
            : item,
        ),
      );
      await loadData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not retry organization.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(resource: Resource) {
    setDeletingId(resource.id);
    try {
      const response = await fetch(`/api/resources/${resource.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not remove this resource.");
      setResources((items) => items.filter((item) => item.id !== resource.id));
      toast.success("File deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this resource.");
    } finally {
      setDeletingId(null);
      setDeleting(null);
    }
  }

  const ctx: RowContext = {
    now,
    busyId,
    deletingId,
    onOrganize: (resource) => {
      setOrganizeError("");
      setOrganizing(resource);
    },
    onRetry: (resource) => void retry(resource),
    onDelete: setDeleting,
  };

  // ---- derived lists -----------------------------------------------------
  const searching = query.trim().length > 0;

  const searched = useMemo(
    () => resources.filter((resource) => matchesQuery(resource, query)),
    [resources, query],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<FileFilter, number> = {
      all: searched.length,
      documents: 0,
      slides: 0,
      images: 0,
      videos: 0,
      other: 0,
    };
    for (const resource of searched) counts[filterOf(resource)] += 1;
    return counts;
  }, [searched]);

  const filtered = useMemo(
    () => (filter === "all" ? searched : searched.filter((resource) => filterOf(resource) === filter)),
    [searched, filter],
  );

  const sorted = useMemo(() => sortResources(filtered, sort), [filtered, sort]);
  const reviewList = useMemo(() => sorted.filter(inReviewQueue), [sorted]);
  const folderCounts = useMemo(() => countFolders(filtered), [filtered]);

  const totalBytes = resources.reduce((sum, resource) => sum + resource.sizeBytes, 0);
  const reviewCount = resources.filter(needsDecision).length;
  const processingCount = resources.filter((r) => r.organizationStatus === "PROCESSING").length;

  const summary = loading
    ? ""
    : resources.length === 0
      ? "Nothing here yet."
      : [
          plural(resources.length, "file"),
          formatSize(totalBytes),
          reviewCount > 0 ? `${reviewCount} need review` : null,
          processingCount > 0 ? `${processingCount} organizing` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const hasFilters = searching || filter !== "all";
  function clearFilters() {
    setQuery("");
    setFilter("all");
  }

  // ---- tabs --------------------------------------------------------------
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "courses", label: "Courses" },
    { id: "all", label: "All files" },
    { id: "review", label: "Needs review", count: reviewCount },
  ];
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onTabKeyDown(event: React.KeyboardEvent, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const target =
      event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : delta ? (index + delta + tabs.length) % tabs.length : -1;
    if (target < 0) return;
    event.preventDefault();
    const next = tabs[target];
    navigate({ tab: next.id, folder: null }, "replace");
    tabRefs.current[next.id]?.focus();
  }

  // The folder browser has its own heading; flat results use the toolbar summary.
  const inFolder = tab === "courses" && Boolean(folder) && !searching;
  const showSort = tab !== "courses" || inFolder || searching;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-5 pb-10 sm:space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Resources</h1>
          <div className="mt-1.5 min-h-5 text-sm text-muted-foreground" aria-live="polite">
            {loading ? <Skeleton className="h-4 w-56 rounded-md" aria-hidden="true" /> : summary}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/resources/courses" className={cn(secondaryButton, "flex-1 sm:flex-none")}>
            <FolderTree size={17} aria-hidden="true" /> Manage courses
          </Link>
          <Link href="/upload" className={cn(primaryButton, "flex-1 sm:flex-none")}>
            <UploadCloud size={18} aria-hidden="true" /> Upload files
          </Link>
        </div>
      </header>

      {loadError && <InlineError message={loadError} onRetry={() => void loadData()} />}

      <div ref={topRef} className="scroll-mt-4 space-y-4">
        <div
          role="tablist"
          aria-label="Resource views"
          className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map(({ id, label, count }, index) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                ref={(element) => {
                  tabRefs.current[id] = element;
                }}
                id={`tab-${id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls="resources-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => navigate({ tab: id, folder: null }, "replace")}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={cn(
                  "-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3.5 text-sm font-medium motion-safe:transition-colors",
                  selected
                    ? "border-violet-600 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                  focusRing,
                )}
              >
                {label}
                {typeof count === "number" && count > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-900 dark:text-amber-300">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {resources.length > 0 && (
          <Toolbar
            query={query}
            onQuery={setQuery}
            filter={filter}
            onFilter={setFilter}
            counts={typeCounts}
            sort={sort}
            onSort={setSort}
            showSort={showSort}
          />
        )}

        <div id="resources-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-1">
          {loading ? (
            tab === "courses" && !searching ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading folders">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Skeleton key={item} className="h-[84px]" />
                ))}
              </div>
            ) : (
              <div className="space-y-px" aria-busy="true" aria-label="Loading files">
                <Skeleton className="h-[76px] rounded-b-none" />
                <Skeleton className="h-[76px] rounded-none" />
                <Skeleton className="h-[76px] rounded-none" />
                <Skeleton className="h-[76px] rounded-t-none" />
              </div>
            )
          ) : tab === "courses" && !searching ? (
            <CourseBrowser
              years={years}
              resources={filtered}
              counts={folderCounts}
              folder={folder}
              onOpenFolder={(next) => navigate({ folder: next }, "push")}
              ctx={ctx}
              sort={sort}
            />
          ) : (
            <FlatList
              tab={tab}
              searching={searching}
              hasFilters={hasFilters}
              hasResources={resources.length > 0}
              hasCourses={years.length > 0}
              list={tab === "review" ? reviewList : sorted}
              query={query}
              ctx={ctx}
              onClear={clearFilters}
            />
          )}
        </div>
      </div>

      {organizing && (
        <OrganizerDialog
          resource={organizing}
          years={years}
          busy={busyId === organizing.id}
          error={organizeError}
          onClose={() => setOrganizing(null)}
          onSave={(location) => void assign(organizing, location)}
        />
      )}
      {deleting && (
        <ConfirmDeleteDialog
          resource={deleting}
          busy={deletingId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove(deleting)}
        />
      )}
    </div>
  );
}

function FlatList({
  tab,
  searching,
  hasFilters,
  hasResources,
  hasCourses,
  list,
  query,
  ctx,
  onClear,
}: {
  tab: Tab;
  searching: boolean;
  hasFilters: boolean;
  hasResources: boolean;
  hasCourses: boolean;
  list: Resource[];
  query: string;
  ctx: RowContext;
  onClear: () => void;
}) {
  const heading = searching
    ? `Results for “${query.trim()}”`
    : tab === "review"
      ? "Review your uploads"
      : "All files";

  if (!hasResources)
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-5 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
          <UploadCloud size={24} aria-hidden="true" />
        </span>
        <p className="mt-4 text-base font-semibold">No resources yet</p>
        <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
          Upload notes, slides, PDFs or images and they&apos;ll appear here with their organization status.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/upload" className={primaryButton}>
            <UploadCloud size={17} aria-hidden="true" /> Upload files
          </Link>
          {!hasCourses && (
            <Link href="/resources/courses" className={secondaryButton}>
              <FolderTree size={16} aria-hidden="true" /> Set up course folders
            </Link>
          )}
        </div>
      </div>
    );

  if (list.length === 0) {
    if (hasFilters)
      return (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-5 py-12 text-center">
          <SearchX size={26} aria-hidden="true" className="text-muted-foreground" />
          <p className="mt-3 text-base font-semibold">No files match</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different word, or clear your filters.</p>
          <button type="button" onClick={onClear} className={cn(secondaryButton, "mt-4")}>
            Clear search and filters
          </button>
        </div>
      );
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-5 py-12 text-center">
        <PartyPopper size={26} aria-hidden="true" className="text-emerald-600 dark:text-emerald-400" />
        <p className="mt-3 text-base font-semibold">Everything is in its place</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Files with unclear names will show up here so you can choose a folder for them.
        </p>
      </div>
    );
  }

  return (
    <section aria-label={heading}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight text-foreground">{heading}</h2>
          {tab === "review" && !searching && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pick a folder for each file. Files marked Waiting are still being read.
            </p>
          )}
        </div>
        <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
          {plural(list.length, "file")}
        </p>
      </div>
      <ResourceList resources={list} ctx={ctx} label={heading} />
    </section>
  );
}

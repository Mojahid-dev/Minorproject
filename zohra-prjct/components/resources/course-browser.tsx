"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  CircleAlert,
  FolderOpen,
  FolderTree,
  Inbox,
  Plus,
  UploadCloud,
} from "lucide-react";
import { formatRelative, plural, resourceKind, type ResourceKind } from "@/lib/dashboard-utils";
import type { Tone } from "@/lib/subject-colors";
import {
  sortResources,
  type FolderCounts,
  type Resource,
  type SortKey,
  type StudyYear,
} from "@/lib/resources-view";
import { cn } from "@/lib/utils";
import { focusRing, panel, primaryButton, secondaryButton } from "@/components/dashboard/shared";
import { FileThumb, ResourceList, type RowContext } from "./resource-row";
import { typeLabel } from "@/lib/resources-view";

export const UNSORTED = "unsorted";

type Props = {
  years: StudyYear[];
  resources: Resource[];
  counts: FolderCounts;
  folder: string | null;
  onOpenFolder: (folder: string | null) => void;
  ctx: RowContext;
  sort: SortKey;
};

function findSubject(years: StudyYear[], id: string) {
  for (const year of years)
    for (const semester of year.semesters) {
      const subject = semester.subjects.find((item) => item.id === id);
      if (subject) return { year, semester, subject };
    }
  return null;
}

const kindName: Record<ResourceKind, string> = {
  pdf: "PDF",
  document: "Docs",
  text: "Text",
  slides: "Slides",
  image: "Images",
  video: "Videos",
  file: "Other",
};

/** "PDF 8 · Slides 3": what is inside a folder, in order of how much there is. */
function kindBreakdown(files: Resource[]) {
  const counts = new Map<ResourceKind, number>();
  for (const file of files) {
    const kind = resourceKind(file.mimeType, file.originalName);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).map(([kind, count]) => ({ label: kindName[kind], count }));
}

function updatedLabel(files: Resource[], now: number | null) {
  if (!files.length || now === null) return null;
  const latest = files.reduce((max, file) => (file.createdAt > max ? file.createdAt : max), files[0].createdAt);
  const text = formatRelative(latest, now);
  return text === "Just now" || text === "Yesterday" ? text.toLowerCase() : text;
}

const shade = { backgroundColor: "rgb(255 255 255 / 0.12)" };

/** Big, solid, poster-like tile for one subject. */
function FolderCard({
  title,
  count,
  chapters,
  updated,
  review,
  tone,
  icon: Icon,
  dashed = false,
  onOpen,
}: {
  title: string;
  count: number;
  chapters?: number;
  updated: string | null;
  review?: number;
  tone: Tone;
  icon: typeof BookOpen;
  dashed?: boolean;
  onOpen: () => void;
}) {
  const detail = typeof chapters === "number" ? plural(chapters, "chapter") : null;

  if (dashed)
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group flex min-h-[200px] w-full flex-col justify-between rounded-3xl border-2 border-dashed border-amber-500/50 p-5 text-left motion-safe:transition-colors hover:border-amber-500 hover:bg-amber-500/5",
          focusRing,
        )}
      >
        <span className="flex items-start justify-between">
          <span aria-hidden="true" className="grid size-11 place-items-center rounded-2xl bg-amber-500/15 text-amber-800 dark:text-amber-300">
            <Icon size={22} />
          </span>
          <span className="text-right">
            <span className="block text-4xl font-bold tabular-nums leading-none text-foreground">{count}</span>
            <span className="text-xs text-muted-foreground">{count === 1 ? "file" : "files"}</span>
          </span>
        </span>
        <span>
          <span className="block text-xl font-bold leading-tight text-foreground">{title}</span>
          <span className="mt-1 block text-sm text-muted-foreground">Needs a folder{updated ? ` · ${updated}` : ""}</span>
        </span>
      </button>
    );

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative flex min-h-[200px] w-full flex-col justify-between overflow-hidden rounded-3xl p-5 text-left shadow-sm motion-safe:transition-[transform,box-shadow] hover:shadow-xl motion-safe:hover:-translate-y-1",
        tone.solid,
        tone.ink,
        focusRing,
      )}
    >
      <span aria-hidden="true" style={shade} className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-110" />
      <span aria-hidden="true" style={shade} className="pointer-events-none absolute -bottom-16 right-10 size-36 rounded-full" />

      <span className="relative flex items-start justify-between gap-3">
        <span aria-hidden="true" style={shade} className="grid size-11 place-items-center rounded-2xl">
          <Icon size={22} />
        </span>
        <span className="text-right">
          <span className="block text-4xl font-bold tabular-nums leading-none">{count}</span>
          <span className={cn("text-xs", tone.soft)}>{count === 1 ? "file" : "files"}</span>
        </span>
      </span>

      <span className="relative mt-6 block pr-12">
        <span className="min-w-0 block">
          <span className="line-clamp-2 block text-xl font-bold leading-tight [overflow-wrap:anywhere]">{title}</span>
          {detail && <span className={cn("mt-1 block text-sm", tone.soft)}>{detail}</span>}
          {updated && <span className={cn("block text-xs", tone.soft)}>Updated {updated}</span>}
          {review ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-950">
              <CircleAlert size={12} aria-hidden="true" /> {review} to review
            </span>
          ) : null}
        </span>
      </span>
      <span aria-hidden="true" style={shade} className="absolute bottom-5 right-5 grid size-10 place-items-center rounded-full motion-safe:transition-transform group-hover:translate-x-1">
        <ArrowRight size={18} />
      </span>
    </button>
  );
}

/** A swipeable strip of the newest files, so the most likely next click is one tap away. */
function RecentStrip({ files, now }: { files: Resource[]; now: number | null }) {
  const recent = [...files].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 8);
  if (recent.length < 3) return null;
  return (
    <section aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="text-lg font-bold tracking-tight text-foreground">Pick up where you left off</h2>
      <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {recent.map((file) => (
          <li key={file.id} className="group relative w-44 shrink-0 snap-start sm:w-48">
            <FileThumb mimeType={file.mimeType} name={file.originalName} ext={typeLabel(file)} compact />
            <Link
              href={`/resources/${file.id}`}
              title={file.originalName}
              className="mt-2 block truncate px-0.5 text-sm font-semibold text-foreground outline-none after:absolute after:inset-0 focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-violet-500"
            >
              {file.originalName}
            </Link>
            <p className="truncate px-0.5 text-xs text-muted-foreground">
              {[file.subject?.name, now ? formatRelative(file.createdAt, now) : null].filter(Boolean).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SetupPanel() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-5 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
        <FolderTree size={24} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold">Set up your course folders</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        Add an academic year, semesters, subjects and chapters. Zohra matches those names against your
        file names and text, and anything unclear waits in Needs review.
      </p>
      <Link href="/resources/courses" className={cn(primaryButton, "mt-5")}>
        <Plus size={17} aria-hidden="true" /> Create course structure
      </Link>
    </div>
  );
}

function Breadcrumb({ trail, onRoot }: { trail: string[]; onRoot: () => void }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        <li>
          <button
            type="button"
            onClick={onRoot}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-lg pr-2 font-medium text-violet-700 hover:underline dark:text-violet-300",
              focusRing,
            )}
          >
            <ArrowLeft size={15} aria-hidden="true" /> Courses
          </button>
        </li>
        {trail.map((part, index) => (
          <li key={`${part}-${index}`} className="flex items-center gap-1.5">
            <ChevronRight size={14} aria-hidden="true" />
            <span
              aria-current={index === trail.length - 1 ? "page" : undefined}
              className={index === trail.length - 1 ? "font-medium text-foreground" : undefined}
            >
              {part}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function FolderDetail({
  title,
  description,
  trail,
  files,
  chapters,
  counts,
  ctx,
  sort,
  onBack,
  isUnsorted,
  tone,
}: {
  tone: Tone;
  title: string;
  description: string;
  trail: string[];
  files: Resource[];
  chapters: { id: string; name: string }[];
  counts: FolderCounts;
  ctx: RowContext;
  sort: SortKey;
  onBack: () => void;
  isUnsorted: boolean;
}) {
  const [chapterId, setChapterId] = useState<string>("all");
  const visible = useMemo(() => {
    const list =
      chapterId === "all"
        ? files
        : chapterId === "none"
          ? files.filter((file) => !file.chapterId)
          : files.filter((file) => file.chapterId === chapterId);
    return sortResources(list, sort);
  }, [files, chapterId, sort]);
  const noChapter = files.filter((file) => !file.chapterId).length;

  const chips = [
    { id: "all", label: "All", count: files.length },
    ...(noChapter > 0 && noChapter < files.length
      ? [{ id: "none", label: "No chapter", count: noChapter }]
      : []),
    ...chapters.map((chapter) => ({
      id: chapter.id,
      label: chapter.name,
      count: counts.chapter.get(chapter.id) ?? 0,
    })),
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb trail={trail} onRoot={onBack} />
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl p-6 sm:p-8",
          isUnsorted ? "border-2 border-dashed border-amber-500/50" : cn(tone.solid, tone.ink),
        )}
      >
        {!isUnsorted && (
          <>
            <span aria-hidden="true" style={shade} className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full" />
            <span aria-hidden="true" style={shade} className="pointer-events-none absolute -bottom-20 right-24 size-40 rounded-full" />
          </>
        )}
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className={cn("text-2xl font-bold tracking-tight sm:text-4xl", isUnsorted && "text-foreground")}>{title}</h2>
            <p className={cn("mt-1.5 text-sm", isUnsorted ? "text-muted-foreground" : tone.soft)}>{description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {kindBreakdown(files).map((kind) => (
                <span
                  key={kind.label}
                  style={isUnsorted ? undefined : shade}
                  className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", isUnsorted && "bg-muted text-muted-foreground")}
                >
                  {kind.label} <span className="tabular-nums">{kind.count}</span>
                </span>
              ))}
            </div>
          </div>
          <Link
            href="/upload"
            style={isUnsorted ? undefined : { backgroundColor: "rgb(255 255 255 / 0.95)" }}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold",
              isUnsorted ? "bg-foreground text-background" : "text-zinc-900",
              focusRing,
            )}
          >
            <UploadCloud size={16} aria-hidden="true" /> Add files
          </Link>
        </div>
      </div>

      {chips.length > 2 && (
        <div
          role="group"
          aria-label="Filter by chapter"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              aria-pressed={chapterId === chip.id}
              onClick={() => setChapterId(chip.id)}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium motion-safe:transition-colors",
                chapterId === chip.id
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-800 dark:text-violet-200"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                focusRing,
              )}
            >
              {chip.label}
              <span className="text-xs tabular-nums opacity-70">{chip.count}</span>
            </button>
          ))}
        </div>
      )}

      {visible.length ? (
        <ResourceList resources={visible} ctx={ctx} showLocation={isUnsorted} label={title} addTile />
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-5 py-10 text-center">
          <FolderOpen size={26} aria-hidden="true" className="text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Nothing here yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Upload files for this subject, or move existing ones here from another folder.
          </p>
          <Link href="/upload" className={cn(secondaryButton, "mt-4")}>
            <UploadCloud size={16} aria-hidden="true" /> Upload files
          </Link>
        </div>
      )}
    </div>
  );
}

export function CourseBrowser({ years, resources, counts, folder, onOpenFolder, ctx, sort }: Props) {
  const back = () => onOpenFolder(null);

  if (folder === UNSORTED)
    return (
      <FolderDetail
        title="Unsorted"
        description="These files need a folder, or a clearer name or alias so Zohra can match them."
        trail={["Unsorted"]}
        files={resources.filter((resource) => !resource.subjectId)}
        chapters={[]}
        counts={counts}
        ctx={ctx}
        sort={sort}
        onBack={back}
        isUnsorted
        tone={ctx.toneOf(null)}
      />
    );

  const found = folder ? findSubject(years, folder) : null;
  if (found) {
    const { year, semester, subject } = found;
    const files = resources.filter((resource) => resource.subjectId === subject.id);
    return (
      <FolderDetail
        key={subject.id}
        title={subject.name}
        description={`${plural(files.length, "file")} · ${plural(subject.chapters.length, "chapter")} · ${year.label}, ${semester.name}`}
        trail={[year.label, semester.name, subject.name]}
        files={files}
        chapters={subject.chapters}
        counts={counts}
        ctx={ctx}
        sort={sort}
        onBack={back}
        isUnsorted={false}
        tone={ctx.toneOf(subject.id)}
      />
    );
  }

  if (!years.length)
    return (
      <div className="space-y-6">
        <SetupPanel />
        {counts.unsorted > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Inbox size={18} aria-hidden="true" className="text-muted-foreground" /> Unsorted
            </h2>
            <ResourceList
              resources={resources.filter((resource) => !resource.subjectId)}
              ctx={ctx}
              label="Unsorted files"
            />
          </div>
        )}
      </div>
    );

  return (
    <div className="space-y-9">
      <RecentStrip files={resources} now={ctx.now} />
      {years.map((year) => (
        <section key={year.id} aria-labelledby={`year-${year.id}`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={`year-${year.id}`} className="text-xl font-bold tracking-tight text-foreground">
              {year.label}
            </h2>
            <p className="text-xs text-muted-foreground">{plural(counts.year.get(year.id) ?? 0, "file")}</p>
          </div>

          {year.semesters.length ? (
            <div className="mt-3 space-y-5">
              {year.semesters.map((semester) => (
                <div key={semester.id}>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{semester.name}</h3>
                  {semester.subjects.length ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] sm:gap-4">
                      {semester.subjects.map((subject) => (
                        <FolderCard
                          key={subject.id}
                          title={subject.name}
                          count={counts.subject.get(subject.id) ?? 0}
                          chapters={subject.chapters.length}
                          updated={updatedLabel(resources.filter((item) => item.subjectId === subject.id), ctx.now)}
                          review={counts.subjectReview.get(subject.id)}
                          tone={ctx.toneOf(subject.id)}
                          icon={BookOpen}
                          onOpen={() => onOpenFolder(subject.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No subjects yet.{" "}
                      <Link
                        href="/resources/courses"
                        className="font-medium text-violet-700 hover:underline dark:text-violet-300"
                      >
                        Add subjects
                      </Link>
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={cn(panel, "mt-3 px-4 py-3 text-sm text-muted-foreground")}>
              No semesters in this year yet.{" "}
              <Link
                href="/resources/courses"
                className="font-medium text-violet-700 hover:underline dark:text-violet-300"
              >
                Add a semester
              </Link>
            </p>
          )}
        </section>
      ))}

      {counts.unsorted > 0 && (
        <section aria-labelledby="unsorted-heading">
          <h2 id="unsorted-heading" className="mb-3 text-lg font-semibold tracking-tight text-foreground">
            Needs a folder
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] sm:gap-4">
            <FolderCard
              title="Unsorted"
              count={counts.unsorted}
              updated={updatedLabel(resources.filter((item) => !item.subjectId), ctx.now)}
              tone={ctx.toneOf(null)}
              icon={Inbox}
              dashed
              onOpen={() => onOpenFolder(UNSORTED)}
            />
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  CircleAlert,
  FolderOpen,
  FolderTree,
  Inbox,
  Plus,
  UploadCloud,
} from "lucide-react";
import { plural } from "@/lib/dashboard-utils";
import {
  sortResources,
  type FolderCounts,
  type Resource,
  type SortKey,
  type StudyYear,
} from "@/lib/resources-view";
import { cn } from "@/lib/utils";
import { focusRing, panel, primaryButton, secondaryButton } from "@/components/dashboard/shared";
import { ResourceList, type RowContext } from "./resource-row";

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

function FolderCard({
  title,
  subtitle,
  review,
  icon: Icon,
  tone = "violet",
  onOpen,
}: {
  title: string;
  subtitle: string;
  review?: number;
  icon: typeof BookOpen;
  tone?: "violet" | "amber";
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex min-h-[84px] w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm motion-safe:transition-colors hover:border-violet-500/40 hover:bg-muted/40",
        focusRing,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          tone === "amber"
            ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
            : "bg-violet-500/10 text-violet-700 dark:text-violet-300",
        )}
      >
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{subtitle}</span>
        {review ? (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-300">
            <CircleAlert size={12} aria-hidden="true" /> {review} to review
          </span>
        ) : null}
      </span>
      <ChevronRight
        size={18}
        aria-hidden="true"
        className="shrink-0 text-muted-foreground motion-safe:transition-transform group-hover:translate-x-0.5"
      />
    </button>
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
}: {
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
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
        <ResourceList resources={visible} ctx={ctx} showLocation={isUnsorted} label={title} />
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
    <div className="space-y-8">
      {years.map((year) => (
        <section key={year.id} aria-labelledby={`year-${year.id}`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={`year-${year.id}`} className="text-lg font-semibold tracking-tight text-foreground">
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {semester.subjects.map((subject) => (
                        <FolderCard
                          key={subject.id}
                          title={subject.name}
                          subtitle={`${plural(counts.subject.get(subject.id) ?? 0, "file")} · ${plural(subject.chapters.length, "chapter")}`}
                          review={counts.subjectReview.get(subject.id)}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <FolderCard
              title="Unsorted"
              subtitle={`${plural(counts.unsorted, "file")} without a folder`}
              icon={Inbox}
              tone="amber"
              onOpen={() => onOpenFolder(UNSORTED)}
            />
          </div>
        </section>
      )}
    </div>
  );
}

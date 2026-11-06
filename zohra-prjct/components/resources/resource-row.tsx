"use client";

import Link from "next/link";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  File,
  FileText,
  FolderTree,
  Image as ImageIcon,
  Loader2,
  Play,
  Plus,
  MoreHorizontal,
  Presentation,
  RotateCcw,
  Trash2,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  formatRelative,
  resourceKind,
  type ResourceKind,
} from "@/lib/dashboard-utils";
import {
  canRetry,
  formatSize,
  locationParts,
  typeLabel,
  type OrganizationStatus,
  type Resource,
} from "@/lib/resources-view";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { focusRing } from "@/components/dashboard/shared";
import type { Tone } from "@/lib/subject-colors";

const kindStyle: Record<ResourceKind, { icon: LucideIcon; tile: string }> = {
  pdf: { icon: FileText, tile: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  document: { icon: FileText, tile: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  text: { icon: FileText, tile: "bg-muted text-muted-foreground" },
  slides: { icon: Presentation, tile: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  image: { icon: ImageIcon, tile: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  video: { icon: Video, tile: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  file: { icon: File, tile: "bg-muted text-muted-foreground" },
};

export function KindTile({
  mimeType,
  name,
  className,
}: {
  mimeType: string;
  name: string;
  className?: string;
}) {
  const { icon: Icon, tile } = kindStyle[resourceKind(mimeType, name)];
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tile, className)}
    >
      <Icon size={20} />
    </span>
  );
}

const statusStyle: Record<
  OrganizationStatus,
  { label: string; className: string; icon: LucideIcon } | null
> = {
  // Organised is the normal state, so it stays quiet.
  ORGANIZED: null,
  PENDING: { label: "Waiting", className: "bg-muted text-muted-foreground", icon: Clock3 },
  PROCESSING: {
    label: "Organizing…",
    className: "bg-sky-500/10 text-sky-800 dark:text-sky-300",
    icon: Loader2,
  },
  NEEDS_REVIEW: {
    label: "Needs review",
    className: "bg-amber-500/15 text-amber-900 dark:text-amber-300",
    icon: CircleAlert,
  },
  FAILED: {
    label: "Could not read",
    className: "bg-destructive/10 text-destructive",
    icon: CircleAlert,
  },
};

export function StatusBadge({
  status,
  showOrganized = false,
  className: extra,
}: {
  status: OrganizationStatus;
  showOrganized?: boolean;
  className?: string;
}) {
  if (status === "ORGANIZED" && showOrganized)
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 size={12} aria-hidden="true" /> Organized
      </span>
    );
  const style = statusStyle[status];
  if (!style) return null;
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        style.className,
        extra,
      )}
    >
      <Icon
        size={12}
        aria-hidden="true"
        className={status === "PROCESSING" ? "motion-safe:animate-spin" : undefined}
      />
      {style.label}
    </span>
  );
}

export type ViewMode = "grid" | "list";

export type RowContext = {
  view: ViewMode;
  toneOf: (subjectId: string | null) => Tone;
  now: number | null;
  busyId: string | null;
  deletingId: string | null;
  onOrganize: (resource: Resource) => void;
  onRetry: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

/** "just now", "2 days ago", "yesterday", or a calendar date such as "Oct 17". */
function addedLabel(iso: string, now: number) {
  const text = formatRelative(iso, now);
  return text === "Just now" ? "just now" : text;
}

function ResourceRow({
  resource,
  ctx,
  showLocation,
}: {
  resource: Resource;
  ctx: RowContext;
  showLocation: boolean;
}) {
  const busy = ctx.busyId === resource.id;
  const deleting = ctx.deletingId === resource.id;
  const retryable = canRetry(resource, ctx.now);
  const canMove = ["NEEDS_REVIEW", "FAILED", "ORGANIZED"].includes(resource.organizationStatus);
  const location = locationParts(resource);
  const needsFolder = resource.organizationStatus === "NEEDS_REVIEW";
  const failed = resource.organizationStatus === "FAILED";
  const showNote = Boolean(resource.organizationNote) && (needsFolder || failed);

  const meta = [
    typeLabel(resource),
    formatSize(resource.sizeBytes),
    resource.pageCount ? `${resource.pageCount} ${resource.pageCount === 1 ? "page" : "pages"}` : null,
    ctx.now
      ? `Added ${addedLabel(resource.createdAt, ctx.now)}`
      : dateFormat.format(new Date(resource.createdAt)),
  ].filter(Boolean);

  const inlineAction = needsFolder ? (
    <button
      type="button"
      disabled={busy}
      onClick={() => ctx.onOrganize(resource)}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground motion-safe:transition-colors hover:bg-muted disabled:opacity-50",
        focusRing,
      )}
    >
      <FolderTree size={14} aria-hidden="true" /> Choose folder
    </button>
  ) : failed ? (
    <button
      type="button"
      disabled={busy}
      onClick={() => ctx.onRetry(resource)}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground motion-safe:transition-colors hover:bg-muted disabled:opacity-50",
        focusRing,
      )}
    >
      {busy ? (
        <Loader2 size={14} aria-hidden="true" className="motion-safe:animate-spin" />
      ) : (
        <RotateCcw size={14} aria-hidden="true" />
      )}
      Retry
    </button>
  ) : null;

  return (
    <li className="relative flex items-start gap-3 px-3 py-3 motion-safe:transition-colors hover:bg-muted/50 sm:px-4">
      <KindTile mimeType={resource.mimeType} name={resource.originalName} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/resources/${resource.id}`}
            title={resource.originalName}
            className="min-w-0 line-clamp-2 text-sm font-medium text-foreground [overflow-wrap:anywhere] outline-none after:absolute sm:line-clamp-1 after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-violet-500"
          >
            {resource.originalName}
          </Link>
          <StatusBadge status={resource.organizationStatus} className="hidden sm:inline-flex" />
        </div>

        <p className="mt-0.5 text-xs text-muted-foreground">{meta.join(" · ")}</p>
        <StatusBadge status={resource.organizationStatus} className="mt-1.5 sm:hidden" />

        {showLocation && location.length > 0 && (
          <p className="mt-1 truncate text-xs text-muted-foreground" title={location.join(" › ")}>
            {location.join(" › ")}
          </p>
        )}

        {resource.tags.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Tags">
            {resource.tags.slice(0, 3).map((tag) => (
              <li
                key={tag}
                className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-xs text-violet-800 dark:text-violet-300"
              >
                #{tag}
              </li>
            ))}
            {resource.tags.length > 3 && (
              <li className="px-1 py-0.5 text-xs text-muted-foreground">+{resource.tags.length - 3}</li>
            )}
          </ul>
        )}

        {showNote && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-amber-900 dark:text-amber-300">
            {resource.organizationNote}
          </p>
        )}

        {inlineAction && <div className="relative z-10 mt-2 sm:hidden">{inlineAction}</div>}
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-1">
        {inlineAction && <div className="hidden sm:block">{inlineAction}</div>}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${resource.originalName}`}
            className={cn(
              "grid size-11 place-items-center rounded-xl text-muted-foreground motion-safe:transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted sm:size-9",
              focusRing,
            )}
          >
            {deleting || (busy && !inlineAction) ? (
              <Loader2 size={18} aria-hidden="true" className="motion-safe:animate-spin" />
            ) : (
              <MoreHorizontal size={18} aria-hidden="true" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem render={<Link href={`/resources/${resource.id}`} />}>
              <Eye /> Preview
            </DropdownMenuItem>
            {canMove && (
              <DropdownMenuItem disabled={busy} onClick={() => ctx.onOrganize(resource)}>
                <FolderTree /> {location.length ? "Move to another folder" : "Choose folder"}
              </DropdownMenuItem>
            )}
            {retryable && (
              <DropdownMenuItem disabled={busy} onClick={() => ctx.onRetry(resource)}>
                <RotateCcw /> Retry organizing
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={deleting}
              onClick={() => ctx.onDelete(resource)}
            >
              <Trash2 /> Delete…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

export function ResourceList({
  resources,
  ctx,
  showLocation = true,
  label,
  addTile = false,
}: {
  resources: Resource[];
  ctx: RowContext;
  showLocation?: boolean;
  label: string;
  addTile?: boolean;
}) {
  if (ctx.view === "grid")
    return (
      <ul
        aria-label={label}
        className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]"
      >
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} ctx={ctx} showLocation={showLocation} />
        ))}
        {addTile && (
          <li>
            <Link
              href="/upload"
              className={cn(
                "group flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed sm:h-44 border-border p-4 text-center text-muted-foreground motion-safe:transition-colors hover:border-violet-500/50 hover:bg-violet-500/5 hover:text-foreground",
                focusRing,
              )}
            >
              <span className="grid size-11 place-items-center rounded-full bg-muted motion-safe:transition-colors group-hover:bg-violet-500/15 group-hover:text-violet-700 dark:group-hover:text-violet-300">
                <Plus size={20} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold">Add files</span>
              <span className="text-xs">PDFs, slides, images</span>
            </Link>
          </li>
        )}
      </ul>
    );

  return (
    <ul
      aria-label={label}
      className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      {resources.map((resource) => (
        <ResourceRow key={resource.id} resource={resource} ctx={ctx} showLocation={showLocation} />
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Card view                                                           */
/* ------------------------------------------------------------------ */

const kindAccent: Record<ResourceKind, { ink: string; bar: string; chip: string }> = {
  pdf: { ink: "text-rose-600 dark:text-rose-300", bar: "bg-rose-500", chip: "bg-rose-600 text-rose-50" },
  document: { ink: "text-blue-600 dark:text-blue-300", bar: "bg-blue-500", chip: "bg-blue-600 text-blue-50" },
  text: { ink: "text-zinc-600 dark:text-zinc-300", bar: "bg-zinc-500", chip: "bg-zinc-600 text-zinc-50" },
  slides: { ink: "text-orange-600 dark:text-orange-300", bar: "bg-orange-500", chip: "bg-orange-600 text-orange-50" },
  image: { ink: "text-emerald-600 dark:text-emerald-300", bar: "bg-emerald-500", chip: "bg-emerald-600 text-emerald-50" },
  video: { ink: "text-sky-600 dark:text-sky-300", bar: "bg-sky-500", chip: "bg-sky-600 text-sky-50" },
  file: { ink: "text-zinc-600 dark:text-zinc-300", bar: "bg-zinc-500", chip: "bg-zinc-600 text-zinc-50" },
};

/** A calm, drawn preview of the kind of file. The type colour lives in the art, not the background. */
function CoverArt({ kind, ext }: { kind: ResourceKind; ext: string }) {
  const accent = kindAccent[kind];
  const lift = "motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:rotate-0";
  const chip = (
    <span className={cn("absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider shadow-sm", accent.chip)}>
      {ext.slice(0, 5)}
    </span>
  );
  const sheet = "relative border border-border bg-card shadow-md";

  if (kind === "slides")
    return (
      <span className={cn(sheet, "block h-[72px] w-[112px] -rotate-2 rounded-lg p-2.5", lift)}>
        <span className={cn("block h-2 w-2/5 rounded-full", accent.bar)} />
        <span className="mt-2.5 grid grid-cols-[1.3fr_1fr] gap-2">
          <span className="h-7 rounded-md bg-muted" />
          <span className="h-7 rounded-md bg-muted" />
        </span>
        {chip}
      </span>
    );
  if (kind === "image")
    return (
      <span className={cn(sheet, "grid h-[76px] w-[100px] rotate-2 place-items-center rounded-lg", lift)}>
        <ImageIcon size={30} aria-hidden="true" className={accent.ink} />
        {chip}
      </span>
    );
  if (kind === "video")
    return (
      <span className={cn(sheet, "grid h-[72px] w-[112px] -rotate-2 place-items-center rounded-lg", lift)}>
        <span className={cn("grid size-10 place-items-center rounded-full", accent.chip)}>
          <Play size={16} aria-hidden="true" className="translate-x-px" />
        </span>
        {chip}
      </span>
    );
  return (
    <span className={cn(sheet, "block h-[96px] w-[74px] -rotate-3 rounded-lg p-2.5", lift)}>
      <span className={cn("block h-1.5 w-2/5 rounded-full", accent.bar)} />
      <span className="mt-2.5 block space-y-1.5">
        <span className="block h-1 w-full rounded-full bg-muted-foreground/25" />
        <span className="block h-1 w-5/6 rounded-full bg-muted-foreground/25" />
        <span className="block h-1 w-full rounded-full bg-muted-foreground/25" />
        <span className="block h-1 w-3/5 rounded-full bg-muted-foreground/25" />
        <span className="block h-1 w-4/5 rounded-full bg-muted-foreground/25" />
      </span>
      {chip}
    </span>
  );
}


const dots = "[background-image:radial-gradient(circle,rgb(120_120_140/0.22)_1px,transparent_1px)] [background-size:14px_14px]";

/** The picture part of a file: used by the grid cards and the "recently added" strip. */
export function FileThumb({
  mimeType,
  name,
  ext,
  compact = false,
  className,
  children,
}: {
  mimeType: string;
  name: string;
  ext: string;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const kind = resourceKind(mimeType, name);
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-2xl bg-muted/70 ring-1 ring-border motion-safe:transition-[box-shadow,--tw-ring-color] group-hover:ring-violet-500/50 group-hover:shadow-lg",
        dots,
        compact ? "h-28" : "h-40 sm:h-44",
        className,
      )}
    >
      <span className={compact ? "block scale-[0.8]" : "block"}>
        <CoverArt kind={kind} ext={ext} />
      </span>
      {children}
    </div>
  );
}

function ResourceCard({
  resource,
  ctx,
  showLocation,
}: {
  resource: Resource;
  ctx: RowContext;
  showLocation: boolean;
}) {
  const tone = ctx.toneOf(resource.subjectId);
  const busy = ctx.busyId === resource.id;
  const deleting = ctx.deletingId === resource.id;
  const retryable = canRetry(resource, ctx.now);
  const canMove = ["NEEDS_REVIEW", "FAILED", "ORGANIZED"].includes(resource.organizationStatus);
  const location = locationParts(resource);
  const needsFolder = resource.organizationStatus === "NEEDS_REVIEW";
  const failed = resource.organizationStatus === "FAILED";
  const showNote = Boolean(resource.organizationNote) && (needsFolder || failed);
  const meta = [
    formatSize(resource.sizeBytes),
    resource.pageCount ? `${resource.pageCount} ${resource.pageCount === 1 ? "page" : "pages"}` : null,
    ctx.now ? addedLabel(resource.createdAt, ctx.now) : null,
  ].filter(Boolean);
  const where = [resource.subject?.name, resource.chapter?.name].filter(Boolean) as string[];

  const actionClass = cn(
    "relative z-10 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 text-sm font-semibold text-background motion-safe:transition-opacity hover:opacity-90 disabled:opacity-50 sm:min-h-10",
    focusRing,
  );

  return (
    <li className="group relative flex flex-col">
      <FileThumb mimeType={resource.mimeType} name={resource.originalName} ext={typeLabel(resource)}>
        <StatusBadge status={resource.organizationStatus} className="absolute left-3 top-3 shadow-sm" />
        <div className="absolute right-2 top-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Actions for ${resource.originalName}`}
              className={cn(
                "grid size-11 place-items-center rounded-xl bg-card/95 text-muted-foreground shadow-sm motion-safe:transition-colors hover:bg-card hover:text-foreground data-popup-open:bg-card sm:size-9 sm:rounded-lg",
                focusRing,
              )}
            >
              {deleting || (busy && !needsFolder && !failed) ? (
                <Loader2 size={17} aria-hidden="true" className="motion-safe:animate-spin" />
              ) : (
                <MoreHorizontal size={17} aria-hidden="true" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem render={<Link href={`/resources/${resource.id}`} />}>
                <Eye /> Preview
              </DropdownMenuItem>
              {canMove && (
                <DropdownMenuItem disabled={busy} onClick={() => ctx.onOrganize(resource)}>
                  <FolderTree /> {location.length ? "Move to another folder" : "Choose folder"}
                </DropdownMenuItem>
              )}
              {retryable && (
                <DropdownMenuItem disabled={busy} onClick={() => ctx.onRetry(resource)}>
                  <RotateCcw /> Retry organizing
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" disabled={deleting} onClick={() => ctx.onDelete(resource)}>
                <Trash2 /> Delete…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </FileThumb>

      <div className="min-w-0 px-1 pb-1 pt-3">
        {showLocation && where.length > 0 && (
          <p className={cn("mb-1 flex min-w-0 items-center gap-1.5 text-xs font-semibold", tone.text)} title={location.join(" › ")}>
            <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", tone.dot)} />
            <span className="truncate">{where.join(" · ")}</span>
          </p>
        )}
        <Link
          href={`/resources/${resource.id}`}
          title={resource.originalName}
          className="line-clamp-2 text-base font-semibold leading-6 text-foreground [overflow-wrap:anywhere] outline-none after:absolute after:inset-0 focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-violet-500 sm:text-sm sm:leading-5"
        >
          {resource.originalName}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">{meta.join(" · ")}</p>

        {resource.tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1" aria-label="Tags">
            {resource.tags.slice(0, 3).map((tag) => (
              <li key={tag} className="max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                #{tag}
              </li>
            ))}
            {resource.tags.length > 3 && <li className="px-1 py-0.5 text-[11px] text-muted-foreground">+{resource.tags.length - 3}</li>}
          </ul>
        )}

        {showNote && <p className="mt-2 line-clamp-2 text-xs leading-5 text-amber-900 dark:text-amber-300">{resource.organizationNote}</p>}

        {needsFolder && (
          <div className="mt-3">
            <button type="button" disabled={busy} onClick={() => ctx.onOrganize(resource)} className={actionClass}>
              <FolderTree size={14} aria-hidden="true" /> Choose folder
            </button>
          </div>
        )}
        {failed && (
          <div className="mt-3">
            <button type="button" disabled={busy} onClick={() => ctx.onRetry(resource)} className={actionClass}>
              {busy ? <Loader2 size={14} aria-hidden="true" className="motion-safe:animate-spin" /> : <RotateCcw size={14} aria-hidden="true" />}
              Retry
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

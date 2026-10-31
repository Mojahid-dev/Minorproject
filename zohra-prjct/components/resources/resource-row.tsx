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

export type RowContext = {
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
}: {
  resources: Resource[];
  ctx: RowContext;
  showLocation?: boolean;
  label: string;
}) {
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

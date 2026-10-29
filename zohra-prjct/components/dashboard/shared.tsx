import { AlertCircle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

/** One focus treatment for every interactive element on the dashboard. */
export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Primary action: the single violet filled button per screen region. */
export const primaryButton = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-violet-50 shadow-sm",
  "motion-safe:transition-colors hover:bg-violet-500 active:bg-violet-700",
  focusRing,
);

/** Secondary action: quiet, bordered. */
export const secondaryButton = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground",
  "motion-safe:transition-colors hover:bg-muted",
  focusRing,
);

export const panel =
  "rounded-2xl border border-border bg-card text-card-foreground shadow-sm";

export function PanelHeader({
  id,
  title,
  description,
  action,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
    >
      <AlertCircle size={18} aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-destructive/40 px-3 text-xs font-semibold hover:bg-destructive/10",
            focusRing,
          )}
        >
          <RotateCw size={14} aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}

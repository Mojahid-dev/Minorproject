"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Timer } from "lucide-react";
import { useStudyTracker } from "@/components/study-progress/study-tracker-provider";

function clock(total: number) {
  const safe = Math.max(0, total);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Always-visible entry to Study & Progress, in the top bar of every page.
 * Idle: a quiet "Study" button. While a session is open: a live timer pill.
 */
export function StudyHeaderButton() {
  const tracker = useStudyTracker();
  const pathname = usePathname();
  const active = tracker.active;
  const onPage = pathname.startsWith("/study-progress");

  if (active) {
    const running = active.status === "RUNNING";
    return (
      <Link
        href="/study-progress"
        data-tour="study-button"
        aria-label={`Study session ${running ? "running" : "paused"}, ${clock(tracker.elapsedSeconds)}. Open Study and Progress`}
        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-violet-200 px-3 text-sm font-semibold tabular-nums text-violet-950 shadow-sm transition hover:bg-violet-100 motion-reduce:transition-none"
      >
        <span aria-hidden="true" className={`size-2 rounded-full ${running ? "bg-emerald-600 motion-safe:animate-pulse" : "bg-amber-600"}`} />
        {clock(tracker.elapsedSeconds)}
      </Link>
    );
  }

  return (
    <Link
      href="/study-progress"
      data-tour="study-button"
      aria-current={onPage ? "page" : undefined}
      aria-label="Open Study and Progress"
      title="Study timer and progress"
      className={`flex h-9 shrink-0 items-center gap-2 rounded-xl border px-2.5 text-sm font-medium transition motion-reduce:transition-none sm:px-3 ${onPage ? "border-white/25 bg-white/[0.12] text-white" : "border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.1] hover:text-white"}`}
    >
      <Timer size={17} aria-hidden="true" />
      <span className="hidden sm:inline">Study</span>
    </Link>
  );
}

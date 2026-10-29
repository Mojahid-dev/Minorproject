"use client";

import Link from "next/link";
import { ArrowRight, MessageSquareText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConversationSummary = { id: string; title: string; updatedAt: string };

/**
 * The one saturated, high-contrast surface on the page: it points at the
 * product's signature feature and stays readable in both themes because it
 * brings its own background and text colors.
 */
export function AskZohraCard({ last }: { last?: ConversationSummary }) {
  return (
    <section
      aria-labelledby="ask-zohra-heading"
      className="relative overflow-hidden rounded-2xl bg-linear-to-br from-violet-600 to-indigo-700 p-4 text-violet-50 shadow-sm sm:p-5"
    >
      <Sparkles
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -top-3 size-24 text-violet-50/10"
      />
      <div className="relative">
        <span className="grid size-10 place-items-center rounded-xl bg-violet-50/15">
          <Sparkles size={20} aria-hidden="true" />
        </span>
        <h2 id="ask-zohra-heading" className="mt-3 text-base font-semibold tracking-tight">
          Ask Zohra AI
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-violet-100">
          Summarise a chapter, quiz yourself, or get unstuck on a topic from your own files.
        </p>

        <Link
          href="/zohra-ai"
          className={cn(
            "mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-50 px-4 text-sm font-semibold text-violet-900 motion-safe:transition-colors hover:bg-white",
            "outline-none focus-visible:ring-2 focus-visible:ring-violet-50 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-700",
          )}
        >
          Start a chat <ArrowRight size={16} aria-hidden="true" />
        </Link>

        {last && (
          <Link
            href="/zohra-ai"
            className={cn(
              "mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-violet-950/25 px-3 text-sm text-violet-100 motion-safe:transition-colors hover:bg-violet-950/40",
              "outline-none focus-visible:ring-2 focus-visible:ring-violet-50",
            )}
          >
            <MessageSquareText size={16} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              <span className="text-violet-200">Last chat: </span>
              {last.title}
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}

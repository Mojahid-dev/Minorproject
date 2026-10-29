"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusRing, panel } from "./shared";

export type OnboardingStep = {
  id: string;
  title: string;
  hint: string;
  href: string;
  done: boolean;
};

/** Shown only until every step is complete, then it removes itself. */
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const done = steps.filter((step) => step.done).length;

  return (
    <section
      aria-labelledby="onboarding-heading"
      className={cn(panel, "border-violet-500/30 p-4 sm:p-5")}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="onboarding-heading" className="text-base font-semibold tracking-tight text-foreground">
          Get set up in three steps
        </h2>
        <p className="text-xs font-medium text-muted-foreground">
          {done} of {steps.length} done
        </p>
      </div>

      <ol className="mt-3 grid gap-2 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.id}>
            <Link
              href={step.href}
              aria-label={`${step.title}${step.done ? " (completed)" : ""}`}
              className={cn(
                "flex min-h-[68px] items-center gap-3 rounded-xl border px-3.5 py-3 motion-safe:transition-colors",
                step.done
                  ? "border-transparent bg-muted/50"
                  : "border-border hover:border-violet-500/40 hover:bg-violet-500/5",
                focusRing,
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  step.done
                    ? "bg-emerald-600 text-emerald-50"
                    : "bg-violet-600/10 text-violet-700 dark:text-violet-300",
                )}
              >
                {step.done ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    step.done ? "text-muted-foreground line-through" : "text-foreground",
                  )}
                >
                  {step.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{step.hint}</span>
              </span>
              {!step.done && (
                <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

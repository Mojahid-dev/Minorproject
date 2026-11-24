"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CircleOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusRing } from "@/components/dashboard/shared";
import { buildToneMap, NEUTRAL_TONE, type Tone } from "@/lib/subject-colors";
import type { StudyYear } from "@/lib/resources-view";

type Subject = { id: string; name: string };
const COLLAPSED_COUNT = 6;

/** Subjects as wrapping chips (no sideways scrolling), coloured like their folders on the Resources page. */
export function SubjectPicker({ subjects, value, onChange }: { subjects: Subject[]; value: string; onChange: (id: string) => void }) {
  const [tones, setTones] = useState<Map<string, Tone>>(new Map());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/study-structure", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && Array.isArray(payload?.years)) setTones(buildToneMap(payload.years as StudyYear[]));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = useMemo(() => {
    if (expanded || subjects.length <= COLLAPSED_COUNT) return subjects;
    const top = subjects.slice(0, COLLAPSED_COUNT);
    const picked = subjects.find((subject) => subject.id === value);
    return picked && !top.includes(picked) ? [...top, picked] : top;
  }, [subjects, expanded, value]);
  const hidden = subjects.length - shown.length;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 flex w-full items-baseline justify-between gap-3 text-sm font-semibold text-foreground">
        <span>Subject</span>
        <span className="text-xs font-normal text-muted-foreground">Groups your time in Insights</span>
      </legend>
      <div role="radiogroup" aria-label="Subject" className="flex flex-wrap gap-2">
        <Chip selected={value === ""} onSelect={() => onChange("")} label="No subject">
          <CircleOff size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />
          <span>No subject</span>
        </Chip>
        {shown.map((subject) => {
          const tone = tones.get(subject.id) ?? NEUTRAL_TONE;
          return (
            <Chip key={subject.id} selected={value === subject.id} onSelect={() => onChange(subject.id)} label={subject.name} tone={tone}>
              <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", tone.dot)} />
              <span className="truncate">{subject.name}</span>
            </Chip>
          );
        })}
        {hidden > 0 && (
          <button type="button" onClick={() => setExpanded(true)} className={cn("min-h-10 rounded-full px-3 text-sm font-medium text-violet-700 hover:bg-violet-500/10 dark:text-violet-300", focusRing)}>
            +{hidden} more
          </button>
        )}
        {expanded && subjects.length > COLLAPSED_COUNT && (
          <button type="button" onClick={() => setExpanded(false)} className={cn("min-h-10 rounded-full px-3 text-sm font-medium text-muted-foreground hover:text-foreground", focusRing)}>
            Show fewer
          </button>
        )}
      </div>
      {subjects.length === 0 && (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Add subjects in Resources and they will show up here.</p>
      )}
    </fieldset>
  );
}

function Chip({ selected, onSelect, label, tone, children }: { selected: boolean; onSelect: () => void; label: string; tone?: Tone; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border px-3.5 text-sm motion-safe:transition-colors",
        selected
          ? cn("font-semibold text-foreground", tone ? cn(tone.tint, tone.border, "bg-clip-padding") : "border-violet-500 bg-violet-500/10")
          : "border-border bg-background font-medium text-foreground hover:bg-muted",
        selected && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-card",
        focusRing,
      )}
    >
      {children}
      {selected && <Check size={14} strokeWidth={3} aria-hidden="true" className="shrink-0" />}
    </button>
  );
}

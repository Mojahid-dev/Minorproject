import type { StudyYear } from "@/lib/resources-view";

/**
 * Every subject gets its own colour, used on its folder card and again on each of its files,
 * so a student can tell "that's my Chemistry stuff" before reading a word.
 * Class names are written out in full so Tailwind can see them.
 */
export type Tone = {
  spine: string;
  tint: string;
  border: string;
  text: string;
  chip: string;
  dot: string;
  line: string;
  /** Solid fill for the big folder tiles, with matching text colours. */
  solid: string;
  ink: string;
  soft: string;
};

export const NEUTRAL_TONE: Tone = {
  spine: "bg-muted-foreground/40",
  tint: "bg-muted/50",
  border: "border-border",
  text: "text-muted-foreground",
  chip: "bg-muted",
  dot: "bg-muted-foreground/50",
  line: "bg-muted-foreground/30",
  solid: "bg-zinc-700 dark:bg-zinc-800",
  ink: "text-zinc-50",
  soft: "text-zinc-300",
};

const TONES: Tone[] = [
  { spine: "bg-violet-500", tint: "bg-violet-500/[0.07]", border: "border-violet-500/25", text: "text-violet-700 dark:text-violet-300", chip: "bg-violet-500/15", dot: "bg-violet-500", line: "bg-violet-500/45", solid: "bg-violet-600 dark:bg-violet-700", ink: "text-violet-50", soft: "text-violet-200" },
  { spine: "bg-rose-500", tint: "bg-rose-500/[0.07]", border: "border-rose-500/25", text: "text-rose-700 dark:text-rose-300", chip: "bg-rose-500/15", dot: "bg-rose-500", line: "bg-rose-500/45", solid: "bg-rose-600 dark:bg-rose-700", ink: "text-rose-50", soft: "text-rose-200" },
  { spine: "bg-amber-500", tint: "bg-amber-500/[0.08]", border: "border-amber-500/30", text: "text-amber-800 dark:text-amber-300", chip: "bg-amber-500/15", dot: "bg-amber-500", line: "bg-amber-500/50", solid: "bg-amber-700 dark:bg-amber-800", ink: "text-amber-50", soft: "text-amber-200" },
  { spine: "bg-emerald-500", tint: "bg-emerald-500/[0.07]", border: "border-emerald-500/25", text: "text-emerald-700 dark:text-emerald-300", chip: "bg-emerald-500/15", dot: "bg-emerald-500", line: "bg-emerald-500/45", solid: "bg-emerald-700 dark:bg-emerald-800", ink: "text-emerald-50", soft: "text-emerald-200" },
  { spine: "bg-sky-500", tint: "bg-sky-500/[0.07]", border: "border-sky-500/25", text: "text-sky-700 dark:text-sky-300", chip: "bg-sky-500/15", dot: "bg-sky-500", line: "bg-sky-500/45", solid: "bg-sky-700 dark:bg-sky-800", ink: "text-sky-50", soft: "text-sky-200" },
  { spine: "bg-fuchsia-500", tint: "bg-fuchsia-500/[0.07]", border: "border-fuchsia-500/25", text: "text-fuchsia-700 dark:text-fuchsia-300", chip: "bg-fuchsia-500/15", dot: "bg-fuchsia-500", line: "bg-fuchsia-500/45", solid: "bg-fuchsia-600 dark:bg-fuchsia-700", ink: "text-fuchsia-50", soft: "text-fuchsia-200" },
  { spine: "bg-teal-500", tint: "bg-teal-500/[0.07]", border: "border-teal-500/25", text: "text-teal-700 dark:text-teal-300", chip: "bg-teal-500/15", dot: "bg-teal-500", line: "bg-teal-500/45", solid: "bg-teal-700 dark:bg-teal-800", ink: "text-teal-50", soft: "text-teal-200" },
  { spine: "bg-orange-500", tint: "bg-orange-500/[0.07]", border: "border-orange-500/25", text: "text-orange-700 dark:text-orange-300", chip: "bg-orange-500/15", dot: "bg-orange-500", line: "bg-orange-500/45", solid: "bg-orange-600 dark:bg-orange-700", ink: "text-orange-50", soft: "text-orange-100" },
];

/** Colours are handed out in the order subjects appear, so neighbours never look alike. */
export function buildToneMap(years: StudyYear[]): Map<string, Tone> {
  const map = new Map<string, Tone>();
  let index = 0;
  for (const year of years)
    for (const semester of year.semesters)
      for (const subject of semester.subjects) {
        map.set(subject.id, TONES[index % TONES.length]);
        index += 1;
      }
  return map;
}

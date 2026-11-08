"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  FolderOpen,
  Heart,
  Quote,
  Sparkles,
  Star,
  Timer,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

// To show more feedback, add an object to `feedbacks` below. Nothing else needs to change:
// the rating summary, the topic filters and the grid all read from this list.
// Set `featured: true` on one entry to give it the highlighted treatment.
// `highlight` is an optional phrase from the quote that gets the marker-pen underline.

// Where the "Share your feedback" link points.
const FEEDBACK_EMAIL = "support@atlas.app";

// How many cards show before "Show more".
const INITIAL_VISIBLE = 6;

const topics = {
  "Zohra AI": Sparkles,
  Planner: CalendarDays,
  "Focus timer": Timer,
  Library: FolderOpen,
  Progress: BarChart3,
  Overall: Heart,
} as const satisfies Record<string, LucideIcon>;

type Topic = keyof typeof topics;

type Feedback = {
  id: string;
  name: string;
  role: string;
  rating: 1 | 2 | 3 | 4 | 5;
  topic: Topic;
  quote: string;
  highlight?: string;
  featured?: boolean;
};

// SAMPLE DATA: replace these with real feedback from your users before launch.
const feedbacks: Feedback[] = [
  {
    id: "f1",
    name: "Aanya R.",
    role: "Physics undergraduate",
    rating: 5,
    topic: "Zohra AI",
    featured: true,
    quote:
      "I uploaded my whole physics PDF and asked what to revise first. It gave me a short list I could actually start on, instead of a wall of text.",
    highlight: "a short list I could actually start on",
  },
  {
    id: "f2",
    name: "Rohan K.",
    role: "Class 12 student",
    rating: 5,
    topic: "Focus timer",
    quote:
      "I locked my phone halfway through a session and the time was still right when I came back. Small thing, but it is why I trust the timer.",
    highlight: "the time was still right when I came back",
  },
  {
    id: "f3",
    name: "Meera S.",
    role: "Nursing student",
    rating: 5,
    topic: "Planner",
    quote:
      "Exams, assignments and the lab report all sit on one calendar. I stopped keeping a separate list in my notes app.",
    highlight: "all sit on one calendar",
  },
  {
    id: "f4",
    name: "Daniel O.",
    role: "Law student",
    rating: 4,
    topic: "Library",
    quote:
      "Finally one place for my notes and PDFs, sorted by subject. Search could be faster with a big library, but everything is where I expect it.",
  },
  {
    id: "f5",
    name: "Priya N.",
    role: "Chemistry undergraduate",
    rating: 5,
    topic: "Progress",
    quote:
      "The weekly hours chart showed me I was ignoring chemistry. I moved two sessions to it the same day.",
    highlight: "ignoring chemistry",
  },
  {
    id: "f6",
    name: "Kabir A.",
    role: "Engineering student",
    rating: 5,
    topic: "Zohra AI",
    quote:
      "Good at explaining the one step I got stuck on, without taking over the whole problem.",
  },
  {
    id: "f7",
    name: "Sara L.",
    role: "Medical student",
    rating: 4,
    topic: "Planner",
    quote:
      "Reminders for due tasks are exactly what I needed. I would love recurring tasks for my weekly quizzes.",
  },
  {
    id: "f8",
    name: "Imran H.",
    role: "Commerce student",
    rating: 5,
    topic: "Focus timer",
    quote:
      "Picking a subject before starting the clock is a tiny bit of friction that makes me honest about what I am studying.",
    highlight: "makes me honest",
  },
  {
    id: "f9",
    name: "Tanvi D.",
    role: "Biology undergraduate",
    rating: 5,
    topic: "Overall",
    quote:
      "Clean, quiet and fast. It does not try to gamify me, and I mean that as a compliment.",
    highlight: "quiet",
  },
  {
    id: "f10",
    name: "Leo M.",
    role: "History student",
    rating: 4,
    topic: "Progress",
    quote: "The streak counter is motivating without being annoying.",
  },
  {
    id: "f11",
    name: "Nisha P.",
    role: "Postgraduate student",
    rating: 4,
    topic: "Zohra AI",
    quote:
      "Great for summaries. Longer PDFs take a while to process, so I start it before making tea.",
  },
  {
    id: "f12",
    name: "Arjun V.",
    role: "Self-taught developer",
    rating: 5,
    topic: "Library",
    quote:
      "I keep my reference PDFs and course links together now instead of across six browser tabs.",
    highlight: "instead of across six browser tabs",
  },
];

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span
      role="img"
      aria-label={`${rating} out of 5 stars`}
      className="flex gap-0.5"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={size}
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
          className={index < rating ? "text-yellow-400" : "text-zinc-700"}
        />
      ))}
    </span>
  );
}

function QuoteText({ text, highlight }: { text: string; highlight?: string }) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (!highlight || at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="box-decoration-clone rounded-[3px] bg-yellow-500/20 px-0.5 text-yellow-100">
        {highlight}
      </mark>
      {text.slice(at + highlight.length)}
    </>
  );
}

function FeedbackCard({
  item,
  index,
  onTopic,
}: {
  item: Feedback;
  index: number;
  onTopic: (topic: Topic) => void;
}) {
  const TopicIcon = topics[item.topic];
  const featured = Boolean(item.featured);

  return (
    <figure
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className={`group relative overflow-hidden rounded-2xl border p-6 transition duration-300 motion-safe:animate-atlas-reveal sm:p-7 ${
        featured
          ? "border-yellow-500/25 bg-gradient-to-br from-yellow-500/10 via-zinc-900 to-zinc-950"
          : "border-white/10 bg-white/[0.025] hover:border-yellow-500/25 hover:bg-white/[0.045]"
      }`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent transition-opacity duration-300 ${
          featured ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      />
      {featured && (
        <Quote
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-6 size-12 text-yellow-500/15"
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <Stars rating={item.rating} />
        <button
          type="button"
          onClick={() => onTopic(item.topic)}
          title={`Show feedback about ${item.topic}`}
          className="inline-flex items-center gap-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 outline-none transition hover:text-yellow-300 focus-visible:ring-2 focus-visible:ring-yellow-400/70"
        >
          <TopicIcon size={12} aria-hidden="true" className="text-yellow-500" />
          {item.topic}
        </button>
      </div>

      <blockquote
        className={`mt-5 text-pretty text-zinc-300 ${
          featured
            ? "text-lg font-medium leading-8 text-zinc-100 sm:text-xl sm:leading-9"
            : "text-[15px] leading-7 sm:text-base"
        }`}
      >
        “<QuoteText text={item.quote} highlight={item.highlight} />”
      </blockquote>

      <figcaption className="mt-6 flex items-center gap-3 border-t border-white/8 pt-5">
        <span
          aria-hidden="true"
          className={`grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
            featured
              ? "bg-yellow-500 text-zinc-950"
              : "border border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
          }`}
        >
          {initialsOf(item.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-zinc-100">
            {item.name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500">
            {item.role}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * Masonry without CSS columns. Cards are dealt round-robin into real columns, so when
 * "Show more" adds cards, the ones already on screen stay exactly where they are.
 */
function Masonry({
  items,
  onTopic,
}: {
  items: Feedback[];
  onTopic: (topic: Topic) => void;
}) {
  const layouts = [
    { cols: 1, className: "md:hidden" },
    { cols: 2, className: "hidden gap-5 md:grid md:grid-cols-2 lg:hidden" },
    { cols: 3, className: "hidden gap-5 lg:grid lg:grid-cols-3" },
  ];

  return (
    <>
      {layouts.map(({ cols, className }) => (
        <div key={cols} className={className}>
          {Array.from({ length: cols }, (_, column) => (
            <div key={column} className="flex min-w-0 flex-col gap-4 sm:gap-5">
              {items.map((item, index) =>
                index % cols === column ? (
                  <FeedbackCard key={item.id} item={item} index={index} onTopic={onTopic} />
                ) : null,
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function RatingSummary({
  items,
  scoped,
  rating,
  onRating,
}: {
  items: Feedback[]; // everything, for the headline average
  scoped: Feedback[]; // what the topic filter currently allows, for the bar counts
  rating: number | null;
  onRating: (rating: number | null) => void;
}) {
  const total = items.length;
  const average = items.reduce((sum, item) => sum + item.rating, 0) / total;
  const rows = [5, 4, 3, 2, 1].map((value) => {
    const count = scoped.filter((item) => item.rating === value).length;
    return { value, count, share: scoped.length ? (count / scoped.length) * 100 : 0 };
  });

  return (
    <aside
      aria-label="Rating summary"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/55 p-6 sm:p-7"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent"
      />
      <div className="grid items-center gap-7 sm:grid-cols-[auto_1fr] sm:gap-9">
        <div>
          <p className="text-6xl font-semibold leading-none tracking-[-0.06em] text-white">
            {average.toFixed(1)}
          </p>
          <div className="mt-3">
            <Stars rating={Math.round(average)} size={16} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            from {total} {total === 1 ? "review" : "reviews"}
          </p>
        </div>

        <div>
          <ul className="space-y-1" aria-label="Filter by rating">
            {rows.map((row) => {
              const active = rating === row.value;
              return (
                <li key={row.value}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={`Show ${row.value}-star feedback (${row.count})`}
                    disabled={row.count === 0 && !active}
                    onClick={() => onRating(active ? null : row.value)}
                    className={`flex w-full items-center gap-3 rounded-md px-1.5 py-1 text-xs outline-none transition enabled:hover:bg-white/[0.05] disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400/70 ${
                      active ? "bg-yellow-500/10" : ""
                    }`}
                  >
                    <span className="flex w-6 items-center gap-0.5 font-medium text-zinc-300">
                      {row.value}
                      <Star size={10} fill="currentColor" strokeWidth={0} aria-hidden="true" className="text-yellow-400" />
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300"
                        style={{ width: `${row.share}%` }}
                      />
                    </span>
                    <span className="w-5 text-right text-zinc-500">{row.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 px-1.5 text-xs text-zinc-600">
            Select a rating to filter the feedback.
          </p>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export default function FeedbackSection() {
  const [activeTopic, setActiveTopic] = useState<Topic | "All">("All");
  const [rating, setRating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const gridTop = useRef<HTMLDivElement>(null);

  const availableTopics = useMemo(
    () =>
      (Object.keys(topics) as Topic[]).filter((topic) =>
        feedbacks.some((item) => item.topic === topic),
      ),
    [],
  );

  // Topic and rating filters combine. Every count on screen shows what you would get by
  // clicking it given the other filter, and options with no results are disabled, so you
  // can never land on an empty list.
  const matchesTopic = (item: Feedback) => activeTopic === "All" || item.topic === activeTopic;
  const matchesRating = (item: Feedback) => rating === null || item.rating === rating;
  const filtered = feedbacks.filter((item) => matchesTopic(item) && matchesRating(item));
  const topicScoped = feedbacks.filter(matchesTopic);
  const ratingScoped = feedbacks.filter(matchesRating);
  const filtersActive = activeTopic !== "All" || rating !== null;

  const hasMore = filtered.length > INITIAL_VISIBLE;
  const visible = expanded || !hasMore ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hiddenCount = filtered.length - visible.length;

  const selectTopic = (topic: Topic | "All") => {
    setActiveTopic(topic);
    setExpanded(false);
  };

  const selectRating = (value: number | null) => {
    setRating(value);
    setExpanded(false);
  };

  const clearFilters = () => {
    setActiveTopic("All");
    setRating(null);
    setExpanded(false);
  };

  const filters: { label: Topic | "All"; count: number }[] = [
    { label: "All", count: ratingScoped.length },
    ...availableTopics.map((topic) => ({
      label: topic,
      count: ratingScoped.filter((item) => item.topic === topic).length,
    })),
  ];

  return (
    <section
      id="feedback"
      aria-labelledby="feedback-heading"
      className="relative isolate overflow-hidden border-t border-white/8 bg-zinc-950 px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-32"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(202,138,4,0.12),transparent_38%),radial-gradient(circle_at_0%_60%,rgba(161,98,7,0.07),transparent_30%)]"
      />

      <div className="mx-auto max-w-7xl">
        <header className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:gap-16">
          <div className="max-w-xl">
            <span className="inline-flex rounded-full border border-yellow-500/25 bg-yellow-500/[0.07] px-3 py-1.5 text-xs font-medium tracking-[0.14em] text-yellow-400">
              FEEDBACK
            </span>
            <h2
              id="feedback-heading"
              className="mt-5 text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl"
            >
              Said by students.
              <br />
              <span className="text-zinc-500">Not by us.</span>
            </h2>
            <p className="mt-6 max-w-md text-pretty text-base leading-7 text-zinc-400">
              Notes from people who use it between lectures, labs and late-night
              revision.
            </p>
          </div>
          <RatingSummary
            items={feedbacks}
            scoped={topicScoped}
            rating={rating}
            onRating={selectRating}
          />
        </header>

        <div
          role="group"
          aria-label="Filter feedback by topic"
          className="-mx-5 mt-12 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {filters.map(({ label, count }) => {
            const active = activeTopic === label;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                disabled={count === 0 && !active}
                onClick={() => selectTopic(label)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 disabled:opacity-40 text-sm font-medium outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                  active
                    ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                    : "border-white/10 text-zinc-400 enabled:hover:border-yellow-500/25 enabled:hover:text-zinc-200"
                }`}
              >
                {label}
                <span
                  className={`text-[11px] ${active ? "text-yellow-500" : "text-zinc-600"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div
          aria-live="polite"
          className="mt-6 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500"
        >
          <p>
            Showing <span className="text-zinc-300">{visible.length}</span> of {filtered.length} reviews
            {rating !== null && ` · ${rating}-star`}
            {activeTopic !== "All" && ` · ${activeTopic}`}
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded text-yellow-400 outline-none transition hover:text-yellow-300 focus-visible:ring-2 focus-visible:ring-yellow-400/70"
            >
              Clear filters
            </button>
          )}
        </div>

        <div ref={gridTop} className="relative mt-8 scroll-mt-28">
          <Masonry key={`${activeTopic}-${rating}`} items={visible} onTopic={selectTopic} />
          {hiddenCount > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent"
            />
          )}
        </div>

        {hasMore && (
          <div className="relative mt-2 flex justify-center">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => {
                if (expanded) gridTop.current?.scrollIntoView({ block: "start" });
                setExpanded((current) => !current);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-950 px-5 py-3 text-sm font-medium text-zinc-200 outline-none transition hover:border-yellow-500/40 hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              {expanded ? "Show less" : `Show ${hiddenCount} more`}
              <ArrowRight
                size={15}
                aria-hidden="true"
                className={`transition-transform duration-300 ${expanded ? "-rotate-90" : "rotate-90"}`}
              />
            </button>
          </div>
        )}

        <aside className="mt-14 rounded-xl border border-white/10 bg-zinc-900/55 px-5 py-5 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              Using Zohra? Tell us what you think.
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              The good, the missing and the annoying all help us build it better.
            </p>
          </div>
          <a
            href={`mailto:${FEEDBACK_EMAIL}?subject=Feedback%20on%20Zohra`}
            className="mt-4 inline-flex shrink-0 items-center gap-2 text-sm font-medium text-yellow-400 transition hover:text-yellow-300 sm:mt-0"
          >
            Share your feedback <span aria-hidden="true">→</span>
          </a>
        </aside>
      </div>
    </section>
  );
}

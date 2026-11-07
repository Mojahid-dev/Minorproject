import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  Flame,
  FolderOpen,
  Layers,
  Sparkles,
  Timer,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

type Status = "Live" | "Coming soon";
type VisualKind =
  | "focus"
  | "insights"
  | "library"
  | "ai"
  | "planner"
  | "courses"
  | "reminders"
  | "syllabus";

type Feature = {
  slug: string;
  kind: VisualKind;
  icon: LucideIcon;
  category: string;
  name: string;
  short: string;
  description: string;
  status: Status;
  where: string;
};

const features: Feature[] = [
  {
    slug: "focus",
    kind: "focus",
    icon: Timer,
    category: "Study tracking",
    name: "Focus timer",
    short: "Focus",
    description:
      "Pick a subject, start the clock, and study. Time is kept on the server, so a locked phone or a closed tab does not lose your session.",
    status: "Live",
    where: "Web · Phone",
  },
  {
    slug: "insights",
    kind: "insights",
    icon: BarChart3,
    category: "Progress",
    name: "Insights and streaks",
    short: "Insights",
    description:
      "See where your hours went by day and by subject, track daily and weekly goals, and keep a streak alive without chasing vanity numbers.",
    status: "Live",
    where: "Web · Phone",
  },
  {
    slug: "library",
    kind: "library",
    icon: FolderOpen,
    category: "Files",
    name: "Resource library",
    short: "Library",
    description:
      "Upload PDFs, notes, slides and images to private storage. Text is extracted from PDFs automatically, and duplicates are caught for you.",
    status: "Live",
    where: "Web · Phone",
  },
  {
    slug: "ai",
    kind: "ai",
    icon: Sparkles,
    category: "Study assistant",
    name: "Zohra AI",
    short: "Zohra AI",
    description:
      "Ask questions in plain English or Hinglish, attach up to three of your own files, and get answers that point back to what you uploaded.",
    status: "Live",
    where: "Web · Phone",
  },
  {
    slug: "planner",
    kind: "planner",
    icon: CalendarDays,
    category: "Planning",
    name: "Tasks and calendar",
    short: "Planner",
    description:
      "Capture tasks, give them dates, and see the week at a glance. Ask Zohra AI to plan your revision and it adds the tasks for you.",
    status: "Live",
    where: "Web · Phone",
  },
  {
    slug: "courses",
    kind: "courses",
    icon: Layers,
    category: "Structure",
    name: "Course organizer",
    short: "Courses",
    description:
      "Arrange everything by year, semester, subject and chapter, so every file and study session has a place that matches your syllabus.",
    status: "Live",
    where: "Web · Phone",
  },
  {
    slug: "reminders",
    kind: "reminders",
    icon: Bell,
    category: "Notifications",
    name: "Smart reminders",
    short: "Reminders",
    description:
      "Get a push notification when tasks are due or an exam is close. You choose the hour and how often, and turn each type off whenever you like.",
    status: "Live",
    where: "Installable app",
  },
  {
    slug: "syllabus",
    kind: "syllabus",
    icon: BookOpenCheck,
    category: "Next up",
    name: "Syllabus coverage",
    short: "Syllabus",
    description:
      "Tie study sessions to the units and topics in your syllabus and see which parts you have covered and which you have not touched yet.",
    status: "Coming soon",
    where: "Web · Phone",
  },
];

const principles = [
  {
    title: "Manual by design",
    text: "Zohra only counts sessions you start. No guessing, no spying on your screen.",
  },
  {
    title: "Your files stay yours",
    text: "Uploads go to private storage and are scoped to your account only.",
  },
  {
    title: "Honest numbers",
    text: "Charts show effort recorded in Zohra. They are not a grade or a prediction.",
  },
  {
    title: "Built for phones",
    text: "Designed for the screen you actually study on, and installable like an app.",
  },
  {
    title: "Light and dark",
    text: "Switch themes any time. Late-night revision should not burn your eyes.",
  },
  {
    title: "No clutter, no copies",
    text: "Upload the same file twice and Zohra tells you instead of duplicating it.",
  },
];

/* ------------------------------------------------------------------ */
/* Small UI mockups (decorative; hidden from assistive tech)           */
/* ------------------------------------------------------------------ */

const mockFrame =
  "relative h-[272px] w-full overflow-hidden rounded-lg border border-white/8 bg-zinc-950/80 p-4 sm:h-[280px] sm:p-5";

function Glow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-yellow-500/[0.07] blur-2xl"
    />
  );
}

function FocusMock() {
  return (
    <div className={mockFrame}>
      <Glow />
      <div className="relative flex h-full items-center justify-center gap-4 sm:gap-8">
        <div className="relative size-24 shrink-0 sm:size-32">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-800" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="264"
              strokeDashoffset="84"
              className="text-yellow-400"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-mono text-base font-semibold tabular-nums text-zinc-100 sm:text-lg">00:42:18</p>
              <p className="text-[10px] tracking-[0.16em] text-zinc-500">ELAPSED</p>
            </div>
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400" /> In progress
          </span>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-yellow-400 px-2.5 py-1 text-[11px] font-semibold text-zinc-950">Networks</span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-zinc-400">Software Eng.</span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-zinc-400">Independent</span>
          </div>
          <div className="h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-zinc-800">
            <span className="block h-full w-2/3 rounded-full bg-yellow-400" />
          </div>
          <p className="text-[11px] text-zinc-500">Daily goal · 1h 20m left</p>
        </div>
      </div>
    </div>
  );
}

function InsightsMock() {
  const bars = [38, 62, 28, 84, 56, 92, 46];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className={mockFrame}>
      <Glow />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between">
          <p className="text-[11px] tracking-[0.14em] text-zinc-500">LAST 7 DAYS</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-medium text-orange-300">
            <Flame size={11} aria-hidden="true" /> 6-day streak
          </span>
        </div>
        <div className="relative mt-3 flex-1">
          <div className="absolute inset-x-0 border-t border-dashed border-yellow-500/40" style={{ bottom: "60%" }} />
          <div className="absolute inset-0 flex items-end gap-2">
            {bars.map((value, index) => (
              <div key={index} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                <span
                  className={`block w-full rounded-t ${value >= 60 ? "bg-yellow-400" : "bg-zinc-700"}`}
                  style={{ height: `${value}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-1.5 flex gap-2">
          {days.map((day, index) => (
            <span key={index} className="flex-1 text-center text-[10px] text-zinc-600">
              {day}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LibraryMock() {
  const files = [
    { name: "Computer Networks notes.pdf", meta: "48 pages", chip: "Text ready", ready: true },
    { name: "Unit 3 slides.pptx", meta: "Slides", chip: "Stored", ready: false },
    { name: "Previous year paper.pdf", meta: "12 pages", chip: "Text ready", ready: true },
  ];
  return (
    <div className={mockFrame}>
      <Glow />
      <div className="relative flex h-full flex-col justify-center gap-2">
        {files.map((file) => (
          <div key={file.name} className="flex items-center justify-between gap-3 rounded-md border border-white/8 bg-zinc-900/70 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-zinc-200">{file.name}</p>
              <p className="mt-0.5 text-[11px] text-zinc-600">{file.meta}</p>
            </div>
            <span
              className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${
                file.ready ? "bg-yellow-500/10 text-yellow-400" : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {file.chip}
            </span>
          </div>
        ))}
        <div className="rounded-md border border-dashed border-white/10 py-2 text-center text-[11px] text-zinc-600">
          Drop files to upload
        </div>
      </div>
    </div>
  );
}

function AiMock() {
  return (
    <div className={mockFrame}>
      <Glow />
      <div className="relative flex h-full flex-col justify-center gap-3">
        <div className="ml-auto max-w-[78%] rounded-xl rounded-br-sm bg-zinc-800 px-3 py-2">
          <p className="text-xs leading-5 text-zinc-200">Explain subnetting simply, from my notes.</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-400">
          Computer Networks notes.pdf
        </span>
        <div className="max-w-[88%] rounded-xl rounded-bl-sm border border-white/8 bg-zinc-900/70 px-3 py-2.5">
          <p className="text-xs leading-5 text-zinc-300">
            Subnetting splits one network into smaller ones by borrowing host bits.
          </p>
          <div className="mt-2 space-y-1.5">
            <span className="block h-1.5 w-full rounded bg-zinc-800" />
            <span className="block h-1.5 w-4/5 rounded bg-zinc-800" />
          </div>
          <p className="mt-2 text-[10px] text-zinc-500">From your file · page 31</p>
        </div>
      </div>
    </div>
  );
}

function PlannerMock() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const tasks = [
    { title: "Finish lab record", done: true },
    { title: "Revise Unit 2", done: false },
    { title: "Mock test on Friday", done: false },
  ];
  return (
    <div className={mockFrame}>
      <Glow />
      <div className="relative flex h-full flex-col justify-center">
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day, index) => (
            <div
              key={index}
              className={`rounded-md py-1.5 text-center ${
                index === 2 ? "bg-yellow-400 text-zinc-950" : "bg-zinc-900/80 text-zinc-500"
              }`}
            >
              <p className="text-[10px] font-medium">{day}</p>
              <p className="text-[11px] font-semibold">{10 + index}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {tasks.map((task) => (
            <div key={task.title} className="flex items-center gap-2.5 rounded-md bg-zinc-900/60 px-3 py-2">
              <span
                className={`grid size-4 shrink-0 place-items-center rounded border text-[10px] ${
                  task.done ? "border-yellow-400 bg-yellow-400 text-zinc-950" : "border-zinc-600 text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={`text-[11px] ${task.done ? "text-zinc-500 line-through" : "text-zinc-300"}`}>{task.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoursesMock() {
  const rows = [
    { label: "Year 3", indent: "ml-0", tone: "text-zinc-500" },
    { label: "Semester 5", indent: "ml-4", tone: "text-zinc-400" },
    { label: "Computer Networks", indent: "ml-8", tone: "text-yellow-400" },
    { label: "Chapter 1 · Data communication", indent: "ml-12", tone: "text-zinc-300" },
    { label: "Chapter 2 · Data link layer", indent: "ml-12", tone: "text-zinc-300" },
  ];
  return (
    <div className={mockFrame}>
      <Glow />
      <div className="relative flex h-full flex-col justify-center gap-2">
        {rows.map((row) => (
          <div key={row.label} className={`${row.indent} flex items-center gap-2 border-l border-white/10 pl-3`}>
            <span className={`text-[11px] font-medium ${row.tone}`}>{row.label}</span>
            {row.label.startsWith("Chapter 2") && (
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">3 files</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RemindersMock() {
  return (
    <div className={mockFrame}>
      <Glow />
      <div className="relative flex h-full flex-col justify-center gap-2.5">
        {[
          { title: "Due today", body: "Finish lab record", time: "8:00 AM" },
          { title: "Exam in 7 days", body: "Time to plan your revision", time: "8:00 AM" },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-900/80 p-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-yellow-400 text-zinc-950">
              <Bell size={13} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-zinc-100">{item.title}</p>
                <p className="text-[10px] text-zinc-600">{item.time}</p>
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SyllabusMock() {
  const units = [
    { label: "Unit 1 · Data communication", value: 100 },
    { label: "Unit 2 · Data link layer", value: 70 },
    { label: "Unit 3 · Network layer", value: 35 },
    { label: "Unit 4 · Transport layer", value: 0 },
  ];
  return (
    <div className={mockFrame}>
      <Glow />
      <div className="relative flex h-full flex-col justify-center gap-3">
        {units.map((unit) => (
          <div key={unit.label}>
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="text-zinc-300">{unit.label}</span>
              <span className="tabular-nums text-zinc-500">{unit.value}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <span className="block h-full rounded-full bg-yellow-400/80" style={{ width: `${unit.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Visual({ kind }: { kind: VisualKind }) {
  const mock =
    kind === "focus" ? <FocusMock /> :
    kind === "insights" ? <InsightsMock /> :
    kind === "library" ? <LibraryMock /> :
    kind === "ai" ? <AiMock /> :
    kind === "planner" ? <PlannerMock /> :
    kind === "courses" ? <CoursesMock /> :
    kind === "reminders" ? <RemindersMock /> :
    <SyllabusMock />;
  return <div aria-hidden="true">{mock}</div>;
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

function Eyebrow({ index, label }: { index: string; label: string }) {
  return (
    <p className="flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-yellow-400">
      <span className="font-mono">{index}/</span>
      <span className="h-px w-6 bg-yellow-500/40" aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const soon = feature.status === "Coming soon";
  return (
    <article
      id={`feature-${feature.slug}`}
      className="group scroll-mt-24 flex min-w-0 flex-col rounded-xl border border-white/10 bg-zinc-900/60 p-4 transition duration-300 hover:-translate-y-1 hover:border-yellow-500/30 hover:bg-zinc-900 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5"
    >
      <Visual kind={feature.kind} />
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500">
          <span className="text-yellow-500">{String(index + 1).padStart(2, "0")}</span>
          <span className="mx-2 text-zinc-700">·</span>
          {feature.category.toUpperCase()}
        </p>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
            soon
              ? "border-white/10 bg-white/[0.03] text-zinc-400"
              : "border-yellow-500/25 bg-yellow-500/[0.07] text-yellow-400"
          }`}
        >
          {feature.status}
        </span>
      </div>
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-zinc-100">{feature.name}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.description}</p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
        <p className="text-xs text-zinc-500">{feature.where}</p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-yellow-400 transition hover:text-yellow-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-400"
        >
          {soon ? "Create an account" : `Try ${feature.short}`}
          <ArrowRight size={14} aria-hidden="true" className="transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}

export default function CoreFeatures() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="border-t border-white/8 bg-zinc-950 px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        {/* 01 / Overview */}
        <header className="max-w-3xl">
          <Eyebrow index="01" label="FEATURES" />
          <h2
            id="features-heading"
            className="mt-5 text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl"
          >
            One desk for everything you study.
          </h2>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-zinc-400">
            Timer, insights, files, planner and an AI assistant that can read your notes. Everything a student needs to
            study consistently, in one place and on one login.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
            >
              Get started free <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-yellow-500/35 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
            >
              Sign in
            </Link>
          </div>
        </header>

        {/* Quick index */}
        <nav aria-label="Feature index" className="mt-12">
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.slug}>
                  <a
                    href={`#feature-${feature.slug}`}
                    className="group flex min-h-[84px] flex-col items-start justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-3 transition hover:border-yellow-500/30 hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
                  >
                    <Icon size={18} aria-hidden="true" className="text-zinc-500 transition group-hover:text-yellow-400" />
                    <span className="text-xs font-medium text-zinc-300">{feature.short}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 02 / The lineup */}
        <div className="mt-20 lg:mt-24">
          <Eyebrow index="02" label="THE LINEUP" />
          <h3 className="mt-4 max-w-2xl text-balance text-2xl font-semibold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            Built around how you actually study.
          </h3>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            {features.map((feature, index) => (
              <FeatureCard key={feature.slug} feature={feature} index={index} />
            ))}
          </div>
          <aside className="mt-5 flex flex-col gap-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-yellow-500">NEXT UP</p>
              <p className="mt-1.5 text-base font-semibold text-zinc-100">More is on the way.</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-400">
                Syllabus coverage and a weekly AI study coach are being built. Create an account now and they appear in
                your workspace when they are ready.
              </p>
            </div>
            <Link
              href="/sign-up"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-yellow-500/35 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
            >
              Create an account <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </aside>
        </div>

        {/* 03 / Principles */}
        <div className="mt-20 lg:mt-24">
          <Eyebrow index="03" label="PRINCIPLES" />
          <h3 className="mt-4 max-w-2xl text-balance text-2xl font-semibold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            Small rules we do not break.
          </h3>
          <ol className="mt-10 grid grid-cols-1 gap-x-10 border-t border-white/8 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((principle, index) => (
              <li key={principle.title} className="border-b border-white/8 py-6">
                <p className="font-mono text-xs text-yellow-500">{String(index + 1).padStart(2, "0")}</p>
                <p className="mt-3 text-base font-semibold text-zinc-100">{principle.title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{principle.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

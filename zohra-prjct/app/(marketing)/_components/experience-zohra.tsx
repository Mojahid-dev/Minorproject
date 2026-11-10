"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ArrowUp,
  BarChart3,
  CalendarDays,
  Check,
  FileText,
  Flame,
  FolderOpen,
  LayoutDashboard,
  Link2,
  ListChecks,
  Paperclip,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

// Autoplay: each screen stays up for 7 seconds (the `zohra-progress_7s` class on the progress
// line near the bottom of this file; change both together if you want a different pace).
// It pauses while the pointer or keyboard focus is anywhere in the section, stops for good
// once the visitor picks a tab, and does not run for visitors who prefer reduced motion.

type PanelId = "today" | "ai" | "tasks" | "calendar" | "resources" | "progress";

type Panel = {
  id: PanelId;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

// These mirror the real app's pages.
const panels: Panel[] = [
  {
    id: "today",
    label: "Today",
    icon: LayoutDashboard,
    title: "Start with what matters.",
    description: "Your focus, your next class and what is due, together in one calm view.",
  },
  {
    id: "ai",
    label: "Zohra AI",
    icon: Sparkles,
    title: "Get help that knows your notes.",
    description: "Ask questions, get quizzed or summarise a chapter, using the files you uploaded.",
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: ListChecks,
    title: "Keep attention on the next step.",
    description: "Turn the right thought into an action without building another list to manage.",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarDays,
    title: "Plan around your real week.",
    description: "Lectures, deadlines and revision blocks sit together in one weekly view.",
  },
  {
    id: "resources",
    label: "Resources",
    icon: FolderOpen,
    title: "Build a library you can search.",
    description: "Upload PDFs and save links once, then find them again by subject.",
  },
  {
    id: "progress",
    label: "Progress",
    icon: BarChart3,
    title: "See your effort add up.",
    description: "Hours, streaks and subjects, so you know where tomorrow's time should go.",
  },
];

/* ------------------------------------------------------------------ */
/* Screens shown inside the window (sample content)                    */
/* ------------------------------------------------------------------ */

function ScreenHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header>
      <p className="text-xs text-zinc-500">{kicker}</p>
      <h3 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h3>
    </header>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-zinc-950/60 p-3.5">
      <p className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-zinc-100">
        {icon}
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

function TodayScreen() {
  return (
    <div>
      <ScreenHeading kicker="Good morning, Aanya" title="Today" />
      <div className="mt-5 grid gap-3 sm:grid-cols-[1.3fr_1fr]">
        <article className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-transparent p-4">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-yellow-500">FOCUS</span>
          <p className="mt-3 text-sm font-semibold text-zinc-100">Complete biology revision notes</p>
          <div className="mt-4 h-1.5 rounded-full bg-zinc-800">
            <div className="h-full w-2/3 rounded-full bg-yellow-500" />
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">2 of 3 sections done</p>
        </article>
        <article className="rounded-xl border border-white/8 bg-zinc-950/60 p-4">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-zinc-500">UP NEXT</span>
          <p className="mt-3 text-sm font-semibold text-zinc-100">Research seminar</p>
          <p className="mt-1 text-xs text-zinc-500">Tomorrow · 10:30</p>
        </article>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat value="2h 40m" label="Studied today" />
        <Stat value="6 days" label="Study streak" icon={<Flame size={16} className="text-yellow-400" aria-hidden="true" />} />
        <Stat value="4" label="Tasks due" />
      </div>
    </div>
  );
}

function AiScreen() {
  const options = ["It lets every molecule through", "It controls what enters and leaves", "It stores the cell's DNA"];
  return (
    <div className="flex h-full flex-col">
      <ScreenHeading kicker="Using Lecture 5.pdf" title="Zohra AI" />
      <div className="mt-5 flex-1 space-y-4">
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-yellow-500 px-3.5 py-2.5 text-xs font-medium text-zinc-950 sm:text-sm">
          Quiz me on cell membranes from my lecture PDF.
        </p>
        <div className="flex gap-2.5">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-yellow-500/25 bg-yellow-500/10 text-yellow-400">
            <Sparkles size={14} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-white/8 bg-zinc-950/60 p-3.5">
            <p className="text-xs leading-5 text-zinc-300 sm:text-sm sm:leading-6">
              Here is question 1 of 3, from page 4:{" "}
              <span className="font-medium text-zinc-100">What does “selectively permeable” mean?</span>
            </p>
            <ul className="mt-3 space-y-1.5">
              {options.map((option, index) => (
                <li
                  key={option}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs ${
                    index === 1
                      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
                      : "border-white/8 text-zinc-400"
                  }`}
                >
                  <span className="grid size-4 shrink-0 place-items-center rounded-full border border-current text-[9px] font-semibold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/70 py-2 pl-3 pr-2">
        <Paperclip size={15} className="text-zinc-600" aria-hidden="true" />
        <span className="flex-1 truncate text-xs text-zinc-600">Ask about Lecture 5.pdf</span>
        <span className="grid size-7 place-items-center rounded-lg bg-yellow-500 text-zinc-950">
          <ArrowUp size={15} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function TasksScreen() {
  const tasks = [
    { title: "Review the seminar sources", subject: "Research", due: "Done", done: true },
    { title: "Complete biology summary", subject: "Biology", due: "Today", done: false },
    { title: "Plan Thursday revision", subject: "Chemistry", due: "Wed", done: false },
    { title: "Send project outline", subject: "Research", due: "Fri", done: false },
  ];
  return (
    <div>
      <ScreenHeading kicker="1 of 4 done" title="Tasks" />
      <div className="mt-4 h-1.5 rounded-full bg-zinc-800">
        <div className="h-full w-1/4 rounded-full bg-yellow-500" />
      </div>
      <ul className="mt-5 space-y-2.5">
        {tasks.map((task) => (
          <li
            key={task.title}
            className="flex items-center gap-3 rounded-xl border border-white/8 bg-zinc-950/60 px-3.5 py-3"
          >
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-md border ${
                task.done ? "border-yellow-500 bg-yellow-500 text-zinc-950" : "border-zinc-700"
              }`}
            >
              {task.done && <Check size={12} strokeWidth={3} aria-hidden="true" />}
            </span>
            <span className={`min-w-0 flex-1 truncate text-sm ${task.done ? "text-zinc-600 line-through" : "text-zinc-200"}`}>
              {task.title}
            </span>
            <span className="hidden rounded-md bg-white/[0.05] px-2 py-0.5 text-[10px] text-zinc-400 sm:inline">
              {task.subject}
            </span>
            <span className={`text-[11px] ${task.due === "Today" ? "font-medium text-yellow-400" : "text-zinc-600"}`}>
              {task.due}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CalendarScreen() {
  const days = [
    { name: "Mon", date: 9 },
    { name: "Tue", date: 10 },
    { name: "Wed", date: 11 },
    { name: "Thu", date: 12 },
    { name: "Fri", date: 13 },
  ];
  const events = [
    { day: 0, top: 10, height: 26, label: "Biology lecture", tone: "plain" },
    { day: 0, top: 58, height: 22, label: "Revision", tone: "gold" },
    { day: 1, top: 28, height: 28, label: "Study block", tone: "gold" },
    { day: 1, top: 70, height: 20, label: "Lab report due", tone: "outline" },
    { day: 2, top: 14, height: 24, label: "Chemistry", tone: "plain" },
    { day: 3, top: 22, height: 32, label: "Seminar", tone: "plain" },
    { day: 3, top: 64, height: 22, label: "Practice quiz", tone: "gold" },
    { day: 4, top: 40, height: 26, label: "Group study", tone: "gold" },
  ];
  const tones: Record<string, string> = {
    plain: "bg-zinc-800 text-zinc-300",
    gold: "bg-yellow-500/15 text-yellow-300 ring-1 ring-inset ring-yellow-500/25",
    outline: "text-zinc-300 ring-1 ring-inset ring-white/20",
  };
  return (
    <div>
      <ScreenHeading kicker="This week" title="Calendar" />
      <div className="mt-5 grid grid-cols-5 gap-2">
        {days.map((day, index) => (
          <div key={day.name} className="min-w-0">
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
              <span className="hidden sm:inline">{day.name}</span>
              <span
                className={`grid size-6 place-items-center rounded-full text-[11px] font-semibold ${
                  index === 1 ? "bg-yellow-500 text-zinc-950" : "text-zinc-400"
                }`}
              >
                {day.date}
              </span>
            </p>
            <div className="relative mt-2 h-60 overflow-hidden rounded-lg border border-white/8 bg-zinc-950/60 sm:h-64">
              {events
                .filter((event) => event.day === index)
                .map((event) => (
                  <span
                    key={event.label}
                    title={event.label}
                    style={{ top: `${event.top}%`, height: `${event.height}%` }}
                    className={`absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-[10px] leading-4 ${tones[event.tone]}`}
                  >
                    <span className="hidden sm:inline">{event.label}</span>
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourcesScreen() {
  const files = [
    { name: "Lecture 5 – Membranes.pdf", meta: "Biology · 2.4 MB", kind: "PDF" },
    { name: "Cell signalling overview", meta: "Biology · Link", kind: "LINK" },
    { name: "Titration practice questions.pdf", meta: "Chemistry · 840 KB", kind: "PDF" },
    { name: "Lab methods checklist", meta: "Chemistry · Link", kind: "LINK" },
  ];
  return (
    <div>
      <ScreenHeading kicker="24 items" title="Resources" />
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/70 px-3 py-2.5">
        <Search size={15} className="text-zinc-600" aria-hidden="true" />
        <span className="text-xs text-zinc-600">Search your library</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["All", "Biology", "Chemistry", "Physics"].map((chip, index) => (
          <span
            key={chip}
            className={`rounded-full border px-3 py-1 text-[11px] ${
              index === 0
                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                : "border-white/10 text-zinc-500"
            }`}
          >
            {chip}
          </span>
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {files.map((file) => (
          <li
            key={file.name}
            className="flex items-center gap-3 rounded-xl border border-white/8 bg-zinc-950/60 px-3.5 py-3"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-yellow-500/10 text-yellow-400">
              {file.kind === "PDF" ? <FileText size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-zinc-200">{file.name}</span>
              <span className="mt-0.5 block text-[11px] text-zinc-500">{file.meta}</span>
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-yellow-500">{file.kind}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProgressScreen() {
  const week = [
    { day: "M", value: 45 },
    { day: "T", value: 70 },
    { day: "W", value: 55 },
    { day: "T", value: 90 },
    { day: "F", value: 35 },
    { day: "S", value: 75 },
    { day: "S", value: 60 },
  ];
  const subjects = [
    { name: "Biology", hours: "5h 40m", share: 100 },
    { name: "Chemistry", hours: "4h 10m", share: 74 },
    { name: "Physics", hours: "3h 30m", share: 62 },
  ];
  return (
    <div>
      <ScreenHeading kicker="This week" title="Study progress" />
      <div className="mt-5 grid gap-3 sm:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-white/8 bg-zinc-950/60 p-4">
          <p className="text-2xl font-semibold tracking-tight text-zinc-100">13h 20m</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Studied this week</p>
          <div className="mt-5 flex h-28 items-end gap-2" aria-hidden="true">
            {week.map((bar, index) => (
              <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span
                  style={{ height: `${bar.value}%` }}
                  className={`w-full rounded-t-md ${
                    bar.value === 90 ? "bg-gradient-to-t from-yellow-600 to-yellow-300" : "bg-zinc-700"
                  }`}
                />
                <span className="text-[10px] text-zinc-600">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-zinc-950/60 p-4">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-zinc-500">BY SUBJECT</p>
          <ul className="mt-4 space-y-4">
            {subjects.map((subject) => (
              <li key={subject.name}>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300">{subject.name}</span>
                  <span className="text-zinc-500">{subject.hours}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                    style={{ width: `${subject.share}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const screens: Record<PanelId, () => ReactNode> = {
  today: TodayScreen,
  ai: AiScreen,
  tasks: TasksScreen,
  calendar: CalendarScreen,
  resources: ResourcesScreen,
  progress: ProgressScreen,
};

/* ------------------------------------------------------------------ */
/* App window                                                          */
/* ------------------------------------------------------------------ */

function AppWindow({ active, children }: { active: Panel; children: ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-x-6 -top-10 bottom-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(234,179,8,0.14),transparent_65%)] blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
        <div aria-hidden="true" className="relative flex items-center border-b border-white/8 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full bg-zinc-700" />
            <span className="size-2 rounded-full bg-zinc-700" />
            <span className="size-2 rounded-full bg-zinc-700" />
          </div>
          <span className="absolute left-1/2 -translate-x-1/2 rounded-md bg-white/[0.04] px-3 py-1 text-[11px] text-zinc-500">
            zohra / {active.label.toLowerCase().replace(" ", "-")}
          </span>
        </div>

        <div className="grid min-h-[440px] grid-cols-[56px_1fr] sm:min-h-[500px] sm:grid-cols-[176px_1fr]">
          <aside aria-hidden="true" className="flex flex-col border-r border-white/8 p-2.5 sm:p-3.5">
            <div className="flex items-center gap-2.5 px-1.5 py-1">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-yellow-500 text-xs font-bold text-zinc-950">
                Z
              </span>
              <span className="hidden text-[11px] font-semibold tracking-[0.18em] text-zinc-300 sm:inline">ZOHRA</span>
            </div>
            <nav className="mt-6 space-y-1">
              {panels.map((panel) => {
                const Icon = panel.icon;
                const current = panel.id === active.id;
                return (
                  <span
                    key={panel.id}
                    className={`flex items-center justify-center gap-2.5 rounded-lg px-2 py-2 text-xs transition-colors sm:justify-start ${
                      current ? "bg-yellow-500/10 text-yellow-400" : "text-zinc-600"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{panel.label}</span>
                  </span>
                );
              })}
            </nav>
            <div className="mt-auto hidden items-center gap-2.5 rounded-lg px-1.5 py-1.5 sm:flex">
              <span className="grid size-7 place-items-center rounded-full border border-yellow-500/25 bg-yellow-500/10 text-[10px] font-bold text-yellow-300">
                AR
              </span>
              <span className="text-xs text-zinc-500">Aanya R.</span>
            </div>
          </aside>

          <div className="min-w-0 p-5 sm:p-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export default function ExperienceZohra() {
  const uid = useId();
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = panels[index];
  const Screen = screens[active.id];

  const choose = (next: number, moveFocus = false) => {
    setIndex(next);
    setAutoplay(false);
    if (moveFocus) tabs.current[next]?.focus();
  };

  const advance = () => setIndex((current) => (current + 1) % panels.length);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = panels.length - 1;
    const forward = index === last ? 0 : index + 1;
    const back = index === 0 ? last : index - 1;
    const target: Record<string, number> = {
      ArrowDown: forward,
      ArrowRight: forward,
      ArrowUp: back,
      ArrowLeft: back,
      Home: 0,
      End: last,
    };
    if (!(event.key in target)) return;
    event.preventDefault();
    choose(target[event.key], true);
  };

  return (
    <section
      id="experience"
      aria-labelledby="experience-heading"
      className="relative isolate overflow-hidden border-t border-white/8 bg-zinc-950 px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-32"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(202,138,4,0.10),transparent_36%)]"
      />

      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-yellow-500/25 bg-yellow-500/[0.07] px-3 py-1.5 text-xs font-medium tracking-[0.14em] text-yellow-400">
            EXPERIENCE ZOHRA
          </span>
          <h2
            id="experience-heading"
            className="mt-5 text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-6xl"
          >
            A workspace that feels familiar from the first day.
          </h2>
          <p className="mt-6 text-pretty text-base leading-7 text-zinc-400">
            Every space is clear on its own and connected when it matters. Take a look around.
          </p>
        </header>

        <div className="group/xp mt-14 grid gap-7 lg:grid-cols-[340px_1fr] lg:items-start lg:gap-12">
          <div
            role="tablist"
            aria-label="Explore Zohra"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
          >
            {panels.map((panel, i) => {
              const selected = i === index;
              const Icon = panel.icon;
              return (
                <button
                  key={panel.id}
                  ref={(node: HTMLButtonElement | null) => {
                    tabs.current[i] = node;
                  }}
                  id={`${uid}-tab-${panel.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${uid}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => choose(i)}
                  className={`relative shrink-0 rounded-full border px-4 py-2.5 text-left outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 lg:w-full lg:rounded-xl lg:p-4 ${
                    selected
                      ? "border-yellow-500/30 bg-yellow-500/[0.08]"
                      : "border-white/10 hover:border-white/20 hover:bg-white/[0.03] lg:border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`grid size-5 place-items-center transition-colors lg:size-9 lg:rounded-lg lg:border ${
                        selected
                          ? "text-yellow-400 lg:border-yellow-500/30 lg:bg-yellow-500/10"
                          : "text-zinc-500 lg:border-white/10"
                      }`}
                    >
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <span
                      className={`text-sm font-medium ${selected ? "text-yellow-300" : "text-zinc-400"}`}
                    >
                      {panel.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className="ml-auto hidden text-[11px] tabular-nums text-zinc-600 lg:inline"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </span>

                  <span
                    className={`hidden transition-[grid-template-rows] duration-300 lg:grid ${
                      selected ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <span className="overflow-hidden">
                      <span className="block pl-12 pt-3 text-sm font-semibold text-zinc-100">{panel.title}</span>
                      <span className="block pl-12 pt-1 text-sm leading-6 text-zinc-400">{panel.description}</span>
                    </span>
                  </span>

                  {selected && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-4 bottom-0 h-px overflow-hidden rounded-full bg-white/10 lg:inset-x-4"
                    >
                      <span
                        onAnimationEnd={autoplay ? advance : undefined}
                        className={`block h-full bg-yellow-400 ${
                          autoplay
                            ? "w-full motion-safe:w-0 motion-safe:animate-[zohra-progress_7s_linear_forwards] group-hover/xp:[animation-play-state:paused] group-focus-within/xp:[animation-play-state:paused]"
                            : "w-full"
                        }`}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            id={`${uid}-panel`}
            role="tabpanel"
            aria-labelledby={`${uid}-tab-${active.id}`}
            tabIndex={0}
            className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            <AppWindow active={active}>
              <div key={active.id} className="h-full motion-safe:animate-atlas-preview-swap">
                <Screen />
              </div>
            </AppWindow>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-md text-center lg:hidden">
          <p className="text-sm font-semibold text-zinc-100">{active.title}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{active.description}</p>
        </div>
      </div>
    </section>
  );
}

/* eslint-disable react/jsx-key */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Compass,
  FolderOpen,
  GraduationCap,
  Layers3,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

const steps = [
  {
    eyebrow: "WELCOME TO ZOHRA",
    title: "A calmer place for your academic life.",
    description:
      "Keep your study materials, daily tasks and learning conversations together. Let's take a quick look around.",
    icon: GraduationCap,
    visual: "welcome",
  },
  {
    eyebrow: "YOUR WORKSPACE",
    title: "Everything starts from your overview.",
    description:
      "Your dashboard brings your day into focus. Find your resources, see what needs attention and pick up where you left off.",
    icon: Compass,
    visual: "dashboard",
  },
  {
    eyebrow: "RESOURCES",
    title: "Bring your study materials together.",
    description:
      "Upload PDFs, documents, presentations and supported media. Your files stay in your private workspace, ready to find and revisit.",
    icon: UploadCloud,
    visual: "resources",
  },
  {
    eyebrow: "PLAN YOUR STUDY",
    title: "Turn intentions into small actions.",
    description:
      "Use Tasks to keep track of what needs doing and Calendar to see your schedule. You can start with just one task.",
    icon: CalendarDays,
    visual: "planning",
  },
  {
    eyebrow: "YOU'RE READY",
    title: "Make this workspace yours.",
    description:
      "There is no perfect setup. Add one resource, create one task, or simply explore. Zohra will be here as your studies grow.",
    icon: Sparkles,
    visual: "ready",
  },
];

function Preview({ kind }: { kind: string }) {
  const panel =
    "min-h-[225px] rounded-2xl border border-white/10 bg-[#111216] p-4 sm:min-h-[270px] sm:p-5";
  if (kind === "welcome")
    return (
      <div
        className={`${panel} relative flex flex-col justify-between overflow-hidden`}
      >
        <div className="absolute -right-10 -top-14 size-56 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-8 place-items-center rounded-xl bg-violet-400/15 text-violet-200">
            <BookOpen size={17} />
          </span>
          Zohra
        </div>
        <div className="relative">
          <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Your studies, in one place.
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">
            A focused workspace for the materials and plans that move you
            forward.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-2">
          {[
            // eslint-disable-next-line react/jsx-key
            [<FolderOpen size={17} />, "Resources"],
            // eslint-disable-next-line react/jsx-key
            [<CalendarDays size={17} />, "Tasks"],
            [<Layers3 size={17} />, "Learning"],
          ].map(([icon, label], i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] p-2 text-[10px] text-zinc-300 sm:p-3 sm:text-xs"
            >
              <span className="text-violet-200">{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  if (kind === "dashboard")
    return (
      <div className={panel}>
        <p className="text-xs text-zinc-500">YOUR WORKSPACE</p>
        <p className="mt-1 text-lg font-semibold">Overview</p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {["Resources", "Tasks", "Conversations"].map((label, i) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3"
            >
              <p className="text-lg font-semibold">{i === 0 ? "0" : "—"}</p>
              <p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">
                {label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-violet-300/20 bg-violet-300/[0.05] p-3">
          <p className="text-xs font-medium text-violet-100">
            A good place to begin
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Add a resource or plan your next study session.
          </p>
        </div>
      </div>
    );
  if (kind === "resources")
    return (
      <div className={panel}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">YOUR LIBRARY</p>
            <p className="mt-1 text-lg font-semibold">Resources</p>
          </div>
          <span className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold">
            <UploadCloud className="mr-1 inline" size={14} />
            Upload
          </span>
        </div>
        <div className="mt-4 flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-violet-300/30 bg-violet-300/[0.035] px-3 text-center">
          <UploadCloud size={25} className="text-violet-200" />
          <p className="mt-2 text-sm font-medium">
            Drop files here or choose files
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            PDF · DOCX · PPTX · Images · Supported media
          </p>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-zinc-500">
          Start with the notes you use most often. Organize them as your library
          grows.
        </p>
      </div>
    );
  if (kind === "planning")
    return (
      <div className={panel}>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-violet-400/10 p-2 text-violet-200">
            <CalendarDays size={17} />
          </span>
          <div>
            <p className="text-xs text-zinc-500">YOUR PLAN</p>
            <p className="text-lg font-semibold">A little progress, daily</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[
            { t: "Review DBMS notes", d: "Today" },
            { t: "Practice 5 questions", d: "Tomorrow" },
            { t: "Prepare for class", d: "This week" },
          ].map((x) => (
            <div
              key={x.t}
              className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
            >
              <span className="size-4 rounded-full border border-zinc-600" />
              <span className="min-w-0 flex-1 text-xs">{x.t}</span>
              <span className="text-[10px] text-zinc-500">{x.d}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Example tasks only — your workspace starts with your own plan.
        </p>
      </div>
    );
  return (
    <div
      className={`${panel} flex flex-col items-center justify-center text-center`}
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-violet-400/15 text-violet-200">
        <Check size={28} />
      </div>
      <p className="mt-4 text-xl font-semibold">Your workspace is ready.</p>
      <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-400">
        Start small. One useful file or one clear task is enough.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs">
          Upload a resource
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs">
          Plan a task
        </span>
      </div>
    </div>
  );
}

export function FirstTimeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const finish = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/onboarding", { method: "POST" });
      if (!response.ok) throw new Error("Unable to save onboarding state");
      window.localStorage.removeItem("zohra:onboarding-step");
      setOpen(false);
      setStep(0);
    } catch {
      /* Keep the current step visible so the user can retry. */
    } finally {
      setSaving(false);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    fetch("/api/onboarding", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { shouldShow?: boolean } | null) => {
        if (alive && data?.shouldShow) {
          const saved = Number(
            window.localStorage.getItem("zohra:onboarding-step") || 0,
          );
          setStep(
            Number.isInteger(saved) && saved >= 0 && saved < steps.length
              ? saved
              : 0,
          );
          setOpen(true);
        }
      })
      .catch(() => undefined);
    const replay = () => {
      window.localStorage.removeItem("zohra:onboarding-step");
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("zohra:open-tour", replay);
    return () => {
      alive = false;
      window.removeEventListener("zohra:open-tour", replay);
    };
  }, []);
  useEffect(() => {
    if (open)
      window.localStorage.setItem("zohra:onboarding-step", String(step));
  }, [open, step]);
  if (!open) return null;
  const current = steps[step];
  const Icon = current.icon;
  const last = step === steps.length - 1;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zohra-tour-title"
    >
      <div className="relative my-auto w-full max-w-4xl overflow-hidden rounded-[26px] border border-white/10 bg-[#090a0d] text-white shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-8 place-items-center rounded-xl bg-violet-400/15 text-violet-200">
              <BookOpen size={17} />
            </span>
            Zohra{" "}
            <span className="ml-1 text-xs font-normal text-zinc-500">
              Getting started
            </span>
          </div>
          <button
            onClick={() => void finish()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-white"
          >
            <span className="hidden sm:inline">Skip tour</span>
            <X size={17} />
          </button>
        </div>
        <div className="grid gap-5 p-5 sm:gap-7 sm:p-7 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div className="flex flex-col justify-center">
            <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-violet-300">
              <Icon size={14} />
              {current.eyebrow}
            </p>
            <h1
              id="zohra-tour-title"
              className="mt-4 max-w-md text-2xl font-semibold leading-tight tracking-[-0.035em] sm:text-3xl"
            >
              {current.title}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
              {current.description}
            </p>
            <div
              className="mt-6 flex items-center gap-2"
              aria-label={`Step ${step + 1} of ${steps.length}`}
            >
              {steps.map((item, i) => (
                <span
                  key={item.eyebrow}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-violet-300" : i < step ? "w-4 bg-violet-500/70" : "w-4 bg-white/15"}`}
                />
              ))}
              <span className="ml-2 text-[11px] text-zinc-500">
                {step + 1} of {steps.length}
              </span>
            </div>
            <div className="mt-7 flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep((v) => v - 1)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-zinc-300 hover:bg-white/[0.06]"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}
              <button
                onClick={() =>
                  last
                    ? void finish()
                    : setStep((v) => Math.min(v + 1, steps.length - 1))
                }
                disabled={saving}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-semibold hover:bg-violet-400 sm:flex-none"
              >
                {last ? "Go to my workspace" : "Continue"}
                <ArrowRight size={16} />
              </button>
            </div>
            <p className="mt-4 text-[11px] text-zinc-600">
              A quick tour. Explore everything at your own pace.
            </p>
          </div>
          <Preview kind={current.visual} />
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.07] bg-white/[0.02] px-5 py-3 sm:px-7">
          <span className="text-[11px] text-zinc-500">
            Made for your learning journey
          </span>
          <span className="text-[11px] text-zinc-500">
            {Math.round(((step + 1) / steps.length) * 100)}% explored
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Compass, FolderOpen, CalendarDays, UploadCloud, X } from "lucide-react";

const steps = [
  {
    path: "/dashboard",
    title: "This is your overview",
    body: "Your workspace starts here. Use this page to get a quick sense of your study activity.",
    hint: "Look around, then open Resources in the sidebar.",
    next: "Explore Resources",
    icon: Compass,
  },
  {
    path: "/resources",
    title: "Your study library",
    body: "This is where your uploaded study materials live. Find and revisit your resources here.",
    hint: "Take a look at your library. Next, let's add a file.",
    next: "Show me Upload",
    icon: FolderOpen,
  },
  {
    path: "/upload",
    title: "Add your first study file",
    body: "Upload PDFs, documents, presentations and supported media from this page.",
    hint: "You can try the upload area now, or continue without uploading anything.",
    next: "Explore Tasks",
    icon: UploadCloud,
  },
  {
    path: "/tasks",
    title: "Turn work into clear next steps",
    body: "Tasks help you remember what needs to get done and keep your work moving.",
    hint: "Find the task creation control. You can create your first task whenever you're ready.",
    next: "Open Calendar",
    icon: Check,
  },
  {
    path: "/calendar",
    title: "See your schedule",
    body: "Your dated tasks can be viewed here, so you can understand what's coming up.",
    hint: "That's the tour. Your workspace is ready to use.",
    next: "Finish tour",
    icon: CalendarDays,
  },
];

export function FirstTimeTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const current = steps[step];

  const finish = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/onboarding", { method: "POST" });
      if (!response.ok) throw new Error("Could not save onboarding state");
      localStorage.removeItem("zohra:onboarding-step");
      setOpen(false);
      setStep(0);
    } catch {
      // Keep the tour open so the user can retry.
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/onboarding", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { shouldShow?: boolean } | null) => {
        if (!active || !data?.shouldShow) return;
        const saved = Number(localStorage.getItem("zohra:onboarding-step") ?? 0);
        const safeStep = Number.isInteger(saved) && saved >= 0 && saved < steps.length ? saved : 0;
        setStep(safeStep);
        setOpen(true);
      })
      .catch(() => undefined);

    const replay = () => {
      localStorage.removeItem("zohra:onboarding-step");
      setStep(0);
      setOpen(true);
      router.push("/dashboard");
    };
    window.addEventListener("zohra:open-tour", replay);
    return () => {
      active = false;
      window.removeEventListener("zohra:open-tour", replay);
    };
  }, [router]);

  useEffect(() => {
    if (open) localStorage.setItem("zohra:onboarding-step", String(step));
  }, [open, step]);

  // If the user clicks the real sidebar navigation, move the guide along with them.
  useEffect(() => {
    if (!open) return;
    const matchingStep = steps.findIndex((item) => item.path === pathname);
    if (matchingStep >= 0 && matchingStep !== step) setStep(matchingStep);
  }, [pathname, open, step]);

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(`[data-tour-nav="${current.path}"]`);
    document.querySelectorAll("[data-tour-nav].zohra-tour-focus").forEach((node) =>
      node.classList.remove("zohra-tour-focus"),
    );
    if (open && nav) {
      nav.classList.add("zohra-tour-focus");
      nav.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    return () => nav?.classList.remove("zohra-tour-focus");
  }, [current.path, open, pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void finish();
      if (event.key === "ArrowRight" && step < steps.length - 1) {
        const next = steps[step + 1];
        setStep(step + 1);
        router.push(next.path);
      }
      if (event.key === "ArrowLeft" && step > 0) {
        const previous = steps[step - 1];
        setStep(step - 1);
        router.push(previous.path);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, finish, router]);

  if (!open) return null;

  const goNext = () => {
    if (step === steps.length - 1) {
      void finish();
      return;
    }
    const next = steps[step + 1];
    setStep(step + 1);
    router.push(next.path);
  };
  const goBack = () => {
    if (step === 0) return;
    const previous = steps[step - 1];
    setStep(step - 1);
    router.push(previous.path);
  };
  const Icon = current.icon;

  return (
    <>
      <style jsx global>{`
        [data-tour-nav].zohra-tour-focus {
          position: relative;
          z-index: 121 !important;
          outline: 2px solid #c4a7ff !important;
          outline-offset: 3px;
          box-shadow: 0 0 0 7px rgba(185, 156, 255, .17), 0 0 0 9999px rgba(0,0,0,.48) !important;
          border-radius: 12px;
        }
        @media (prefers-reduced-motion: no-preference) {
          [data-tour-nav].zohra-tour-focus { animation: zohra-tour-pulse 1.8s ease-in-out infinite; }
          @keyframes zohra-tour-pulse {
            0%,100% { outline-color: #b99cff; }
            50% { outline-color: #e0d1ff; }
          }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-[110] bg-black/25" aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="zohra-tour-title"
        className="fixed bottom-4 left-1/2 z-[130] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-violet-300/25 bg-[#15131b] text-white shadow-[0_24px_90px_rgba(0,0,0,.72)] sm:bottom-6"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-violet-400/15 text-violet-200"><Icon size={17} /></span>
            <span className="text-xs font-semibold">Explore Zohra</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-400">{step + 1} / {steps.length}</span>
            <button type="button" onClick={() => void finish()} disabled={saving} aria-label="Close tour" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"><X size={16} /></button>
          </div>
        </div>
        <div className="px-4 pb-4 pt-3">
          <div className="mb-3 flex gap-1" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((item, index) => (
              <span key={item.path} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-violet-300" : "bg-white/10"}`} />
            ))}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-300">{current.path.slice(1)}</p>
          <h2 id="zohra-tour-title" className="mt-1 text-lg font-semibold tracking-tight">{current.title}</h2>
          <p className="mt-1.5 text-xs leading-5 text-zinc-300">{current.body}</p>
          <div className="mt-3 rounded-xl bg-violet-300/[.08] px-3 py-2 text-[11px] leading-5 text-violet-100">
            <span className="mr-1">✦</span>{current.hint}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={() => void finish()} disabled={saving} className="text-xs text-zinc-400 hover:text-white">Skip tour</button>
            <div className="flex items-center gap-2">
              {step > 0 && <button type="button" onClick={goBack} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200 hover:bg-white/[.06]"><ArrowLeft size={13} className="mr-1 inline" />Back</button>}
              <button type="button" onClick={goNext} disabled={saving} className="rounded-lg bg-violet-300 px-3.5 py-2 text-xs font-semibold text-[#17121e] hover:bg-violet-200 disabled:opacity-50">
                {saving ? "Saving…" : current.next} <ArrowRight size={13} className="ml-1 inline" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[9px] text-zinc-500">Tip: You can also click the highlighted section in the sidebar.</p>
        </div>
      </section>
    </>
  );
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, MousePointerClick, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOUR_CHAPTERS, TOUR_STEPS, type TourStep } from "@/lib/tour-steps";

/**
 * Hands-on product tour. It spotlights the real controls on the real pages,
 * navigates between them, and for "do it" steps waits for the person to tap or
 * act instead of asking them to read.
 *
 * State: localStorage "zohra:tour" ({ s: "active" | "done", i: stepIndex }),
 * so it survives route changes and the (app) <-> (focus) layout switch.
 * First-run: GET /api/onboarding -> shouldShow. Finished/skipped: POST it.
 */

const KEY = "zohra:tour";
const PAD = 8;
type Rect = { top: number; left: number; width: number; height: number };

function readState(): { s?: string; i?: number } {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function writeState(value: { s: "active" | "done"; i?: number }) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* private mode: the tour just won't resume */
  }
}

function routeMatches(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function findTarget(step: TourStep): HTMLElement | null {
  for (const selector of step.targets ?? []) {
    for (const node of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      const el = step.closest ? (node.closest(step.closest) as HTMLElement | null) : node;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

export function ProductTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [index, setIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [giveUp, setGiveUp] = useState(false);
  const [vp, setVp] = useState({ w: 1024, h: 768 });
  const [cardH, setCardH] = useState(200);
  const cardRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const step = index >= 0 ? TOUR_STEPS[index] : null;

  // ---- start / resume ------------------------------------------------------
  useEffect(() => {
    setMounted(true);
    const saved = readState();
    if (saved.s === "active" && typeof saved.i === "number" && saved.i < TOUR_STEPS.length) {
      setIndex(saved.i);
    } else if (saved.s !== "done") {
      let alive = true;
      fetch("/api/onboarding", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => {
          if (alive && p?.shouldShow) setIndex(0);
        })
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }
  }, []);

  useEffect(() => {
    const open = () => setIndex(0);
    window.addEventListener("zohra:open-tour", open);
    return () => window.removeEventListener("zohra:open-tour", open);
  }, []);

  useEffect(() => {
    if (index >= 0) writeState({ s: "active", i: index });
  }, [index]);

  const finish = useCallback(() => {
    setIndex(-1);
    writeState({ s: "done" });
    window.dispatchEvent(new CustomEvent("zohra:tour-more", { detail: false }));
    void fetch("/api/onboarding", { method: "POST" }).catch(() => undefined);
  }, []);

  const go = useCallback(
    (to: number) => {
      if (to >= TOUR_STEPS.length) finish();
      else setIndex(Math.max(0, to));
    },
    [finish],
  );

  // ---- keep the person on the right page -------------------------------------
  useEffect(() => {
    if (!step || routeMatches(pathname, step.route)) return;
    const t = window.setTimeout(() => router.push(step.route), 350);
    return () => window.clearTimeout(t);
  }, [step, pathname, router]);

  // Phones: open the "More" menu when the target lives inside it.
  useEffect(() => {
    if (!step) return;
    const wantOpen = Boolean(step.openMore) && window.innerWidth < 1024;
    window.dispatchEvent(new CustomEvent("zohra:tour-more", { detail: wantOpen }));
  }, [step]);

  // ---- find + follow the target ----------------------------------------------
  useEffect(() => {
    setTarget(null);
    setRect(null);
    setGiveUp(false);
    if (!step || step.kind || !step.targets) return;
    let raf = 0;
    let scrolled = false;
    const started = performance.now();
    let current: HTMLElement | null = null;
    const tick = () => {
      setVp((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }));
      if (!current || !current.isConnected) {
        current = routeMatches(pathRef.current, step.route) ? findTarget(step) : null;
        if (current) {
          setTarget(current);
          scrolled = false;
        } else if (performance.now() - started > 3500) {
          setGiveUp(true);
        }
      }
      if (current) {
        if (!scrolled) {
          scrolled = true;
          const r = current.getBoundingClientRect();
          const tall = r.height > window.innerHeight * 0.6;
          if (r.top < 80 || r.bottom > window.innerHeight - 80 || tall) {
            current.scrollIntoView({ block: tall ? "start" : "center", behavior: "smooth" });
          }
        }
        const r = current.getBoundingClientRect();
        setRect((prev) =>
          prev && Math.abs(prev.top - r.top) < 0.5 && Math.abs(prev.left - r.left) < 0.5 && Math.abs(prev.width - r.width) < 0.5 && Math.abs(prev.height - r.height) < 0.5
            ? prev
            : { top: r.top, left: r.left, width: r.width, height: r.height },
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, pathname]);

  // ---- hands-on triggers ----------------------------------------------------------
  useEffect(() => {
    if (!step?.action) return;
    const action = step.action;
    let timer = 0;
    const advance = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => go(index + 1), delay);
    };
    if (action.type === "event") {
      const handler = () => advance(900);
      window.addEventListener(action.name, handler);
      return () => {
        window.removeEventListener(action.name, handler);
        window.clearTimeout(timer);
      };
    }
    if (target) {
      const handler = () => advance(150);
      target.addEventListener("click", handler, true);
      return () => {
        target.removeEventListener("click", handler, true);
        window.clearTimeout(timer);
      };
    }
  }, [step, target, index, go]);

  // ---- keyboard + focus -----------------------------------------------------------
  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]");
      if (typing) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, index, go, finish]);

  useEffect(() => {
    if (step) cardRef.current?.querySelector<HTMLElement>("[data-tour-primary]")?.focus({ preventScroll: true });
  }, [step]);

  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && Math.abs(h - cardH) > 1) setCardH(h);
  });

  const chapterIndex = step ? TOUR_CHAPTERS.findIndex((c) => c.id === step.chapter) : 0;
  const stepsInChapter = useMemo(() => (step ? TOUR_STEPS.filter((s) => s.chapter === step.chapter && !s.kind) : []), [step]);
  const posInChapter = step ? stepsInChapter.findIndex((s) => s.id === step.id) : 0;

  if (!mounted || !step) return null;

  const centered = Boolean(step.kind) || !step.targets || (giveUp && !rect);
  const interactive = Boolean(step.action) && step.action?.type === "click";
  const hole = rect && !centered
    ? {
        top: Math.max(rect.top - PAD, 4),
        left: Math.max(rect.left - PAD, 4),
        width: Math.min(rect.width + PAD * 2, vp.w - 8),
        height: Math.min(rect.height + PAD * 2, vp.h - 8),
      }
    : null;

  // ---- card placement -----------------------------------------------------------------
  const phone = vp.w < 640;
  const cardW = phone ? vp.w - 24 : 340;
  let style: React.CSSProperties = {};
  if (!centered && hole) {
    const below = vp.h - (hole.top + hole.height);
    const above = hole.top;
    const need = cardH + 16;
    if (phone) {
      const placeTop = above > below;
      style = placeTop
        ? { top: "max(12px, env(safe-area-inset-top))", left: 12, width: cardW }
        : { bottom: "max(12px, env(safe-area-inset-bottom))", left: 12, width: cardW };
      if (Math.max(above, below) < need) style = { bottom: "max(12px, env(safe-area-inset-bottom))", left: 12, width: cardW };
    } else {
      const clampX = (x: number) => Math.min(Math.max(12, x), vp.w - cardW - 12);
      const clampY = (y: number) => Math.min(Math.max(12, y), vp.h - cardH - 12);
      if (hole.left + hole.width + cardW + 28 < vp.w && hole.left < 320) {
        style = { top: clampY(hole.top), left: hole.left + hole.width + 16, width: cardW };
      } else if (below >= need) {
        style = { top: hole.top + hole.height + 14, left: clampX(hole.left + hole.width / 2 - cardW / 2), width: cardW };
      } else if (above >= need) {
        style = { top: hole.top - cardH - 14, left: clampX(hole.left + hole.width / 2 - cardW / 2), width: cardW };
      } else if (hole.left > cardW + 28) {
        style = { top: clampY(hole.top), left: hole.left - cardW - 16, width: cardW };
      } else {
        style = { bottom: 20, right: 20, width: cardW };
      }
    }
  }

  const isWelcome = step.kind === "welcome";
  const isFinish = step.kind === "finish";
  const last = index === TOUR_STEPS.length - 1;
  const waiting = Boolean(step.action) && !centered;
  const Icon = TOUR_CHAPTERS[chapterIndex]?.icon;

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="presentation">
      {/* Click shields: block everything except the highlighted control on "do it" steps. */}
      {hole && interactive ? (
        <>
          <div className="fixed left-0 right-0 top-0" style={{ height: hole.top }} />
          <div className="fixed bottom-0 left-0 right-0" style={{ top: hole.top + hole.height }} />
          <div className="fixed left-0" style={{ top: hole.top, height: hole.height, width: hole.left }} />
          <div className="fixed right-0" style={{ top: hole.top, height: hole.height, left: hole.left + hole.width }} />
        </>
      ) : (
        <div className="fixed inset-0" style={hole ? undefined : { background: "rgba(8,6,20,0.66)" }} />
      )}

      {hole && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl motion-safe:transition-[top,left,width,height] motion-safe:duration-300"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            boxShadow: "0 0 0 100vmax rgba(8,6,20,0.66), 0 0 0 2px #8b5cf6, 0 0 28px 4px rgba(139,92,246,0.45)",
          }}
        >
          {waiting && (
            <span className="absolute inset-0 rounded-2xl border-2 border-violet-400 motion-safe:animate-ping" style={{ animationDuration: "1.8s" }} />
          )}
          {interactive && (
            <span
              className="absolute -bottom-3 right-3 grid size-9 place-items-center rounded-full bg-violet-600 text-white shadow-lg motion-safe:animate-bounce"
              style={{ animationDuration: "1.4s" }}
            >
              <MousePointerClick size={18} aria-hidden="true" />
            </span>
          )}
        </div>
      )}

      {/* Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-label={`Tour: ${step.title}`}
        className={cn(
          "fixed rounded-2xl border border-border bg-card text-card-foreground shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
          centered && "left-1/2 top-1/2 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2",
        )}
        style={centered ? undefined : style}
      >
        {isWelcome ? (
          <div className="p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Quick tour</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">{step.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {TOUR_CHAPTERS.map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-2 rounded-xl bg-violet-500/10 px-2 py-3.5">
                  <span className="grid size-9 place-items-center rounded-full bg-violet-600 text-white">
                    <c.icon size={17} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">{c.label}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              data-tour-primary
              onClick={() => go(index + 1)}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            >
              Start the tour <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={finish} className="mt-1 h-11 w-full rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground">
              Skip for now
            </button>
          </div>
        ) : isFinish ? (
          <div className="p-5 sm:p-6">
            <span className="grid size-11 place-items-center rounded-full bg-emerald-600 text-white">
              <Check size={22} strokeWidth={3} aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">{step.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            <div className="mt-4 grid gap-2">
              {[
                { href: "/upload", label: "Upload your first file" },
                { href: "/tasks", label: "Plan tomorrow" },
                { href: "/zohra-ai", label: "Ask Zohra AI" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={finish}
                  className="flex h-12 items-center justify-between rounded-xl border border-border px-4 text-sm font-semibold hover:border-violet-500/50 hover:bg-violet-500/5"
                >
                  {item.label}
                  <ArrowRight size={16} aria-hidden="true" className="text-muted-foreground" />
                </Link>
              ))}
            </div>
            <button
              type="button"
              data-tour-primary
              onClick={finish}
              className="mt-3 h-11 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Done
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Replay this any time with “Take the tour”.</p>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                {Icon && <Icon size={12} aria-hidden="true" />} {TOUR_CHAPTERS[chapterIndex]?.label}
              </span>
              <button type="button" onClick={finish} aria-label="Close tour" className="grid size-9 -mr-2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <h2 className="mt-2.5 text-[17px] font-semibold leading-snug tracking-tight">{step.title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.body}</p>
            {waiting && step.action && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-violet-600/10 px-3 py-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full rounded-full bg-violet-500 opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-violet-500" />
                </span>
                {step.action.hint}
              </p>
            )}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex flex-1 items-center gap-1" aria-hidden="true">
                {TOUR_CHAPTERS.map((c, i) => (
                  <span
                    key={c.id}
                    className={cn("h-1 flex-1 rounded-full", i < chapterIndex ? "bg-violet-500" : i === chapterIndex ? "bg-violet-500/50" : "bg-muted")}
                  />
                ))}
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {posInChapter + 1}/{stepsInChapter.length}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(index - 1)}
                disabled={index === 0}
                className="h-11 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={finish}
                className="h-11 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Skip tour
              </button>
              <button
                type="button"
                data-tour-primary
                onClick={() => go(index + 1)}
                className={cn(
                  "ml-auto inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400",
                  waiting ? "border border-border text-foreground hover:bg-muted" : "bg-violet-600 text-white hover:bg-violet-500",
                )}
              >
                {waiting ? "Skip this" : last ? "Finish" : "Next"}
                {!waiting && <ArrowRight size={15} aria-hidden="true" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

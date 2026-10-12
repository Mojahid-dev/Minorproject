"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, Check, Clock3, RotateCcw, ShieldCheck, X } from "lucide-react";

type RequestState = {
  id: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "REVOKED" | "CANCELLED";
  createdAt: string;
  reviewedAt: string | null;
};

export function RecognitionRequestCard({ initialRequest, initialEligibleAt }: {
  initialRequest: RequestState | null;
  initialEligibleAt: string | null;
}) {
  const [request, setRequest] = useState(initialRequest);
  const [eligibleAt, setEligibleAt] = useState(initialEligibleAt);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/recognition-request", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load recognition status.");
      setRequest(payload.request ?? null);
      setEligibleAt(payload.eligibleAt ?? null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load recognition status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (request?.status !== "PENDING") return;
    const timer = window.setInterval(() => { void refresh(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [request?.status, refresh]);

  async function requestRecognition() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/recognition-request", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not submit your request.");
      setRequest(payload.request);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit your request.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest() {
    if (!request) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/recognition-request/${request.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not cancel your request.");
      setRequest({ ...request, status: "CANCELLED" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel your request.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const declinedWait = request?.status === "DECLINED" && eligibleAt && new Date(eligibleAt) > new Date();
  const requestDate = eligibleAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(eligibleAt)) : "";

  return <section aria-labelledby="recognition-heading" className="rounded-3xl border border-violet-200/15 bg-gradient-to-br from-[#1d1a2b] to-[#12131a] p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-violet-200/20 bg-violet-200/10 text-violet-100"><Award size={19} /></span>
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">Rare account recognition</p><h2 id="recognition-heading" className="mt-1 text-lg font-semibold text-white">Zohra Recognized</h2><p className="mt-1 max-w-xl text-sm leading-6 text-neutral-400">Recognition is granted personally by the Zohra team. Requesting it does not guarantee approval.</p></div>
      </div>
      {request?.status === "APPROVED" && <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-violet-200/25 bg-violet-200/10 px-3 text-xs font-semibold text-violet-100"><ShieldCheck size={14} />Recognized</span>}
    </div>

    <div className="mt-4 border-t border-white/[0.08] pt-4">
      {loading ? <p className="text-sm text-neutral-400">Checking your recognition status…</p>
        : request?.status === "APPROVED" ? <p className="flex items-center gap-2 text-sm text-violet-100"><Check size={16} />Your account has been recognized by Zohra.</p>
          : request?.status === "PENDING" ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm text-neutral-200"><Clock3 size={16} className="text-amber-200" />Your request is waiting for review.</p><button type="button" disabled={busy} onClick={() => void cancelRequest()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-neutral-300 transition hover:bg-white/[0.06] disabled:opacity-50"><X size={15} />{busy ? "Cancelling…" : "Cancel request"}</button></div>
            : declinedWait ? <p className="flex items-start gap-2 text-sm leading-6 text-neutral-300"><Clock3 size={16} className="mt-0.5 shrink-0 text-amber-200" />You may send another request after {requestDate}.</p>
              : <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-neutral-400">{request?.status === "DECLINED" ? "You can request recognition again." : request?.status === "REVOKED" ? "Recognition is no longer active. You may send a new request." : "If you would like the team to consider your account, send a request."}</p><button type="button" disabled={busy} onClick={() => void requestRecognition()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-200 px-4 text-sm font-semibold text-violet-950 shadow-[0_8px_24px_rgba(196,181,253,0.12)] transition hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60"><RotateCcw size={15} />{busy ? "Sending…" : "Request recognition"}</button></div>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-300/[0.08] px-3 py-2 text-sm text-rose-200">{error}</p>}
      <p className="mt-3 text-xs leading-5 text-neutral-500">This is separate from email verification. You do not need to explain or upload anything.</p>
    </div>
  </section>;
}

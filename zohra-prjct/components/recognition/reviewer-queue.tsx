"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Clock3, LoaderCircle, ShieldX, UserRound, X } from "lucide-react";

type RecognitionRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "REVOKED" | "CANCELLED";
  createdAt: string;
  reviewedAt: string | null;
  reviewerId: string | null;
  user: { id: string; name: string; email: string; emailVerified: boolean; image: string | null; resourceCount: number; completedTaskCount: number };
};

const statusLabel: Record<RecognitionRequest["status"], string> = {
  PENDING: "Pending review",
  APPROVED: "Recognized",
  DECLINED: "Declined",
  REVOKED: "Revoked",
  CANCELLED: "Cancelled",
};

function shortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function RecognitionReviewerQueue() {
  const [requests, setRequests] = useState<RecognitionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/recognition-requests", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load recognition requests.");
      setRequests(payload.requests);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load recognition requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function decide(request: RecognitionRequest, decision: "APPROVED" | "DECLINED" | "REVOKED") {
    setBusyId(request.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/recognition-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save this decision.");
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: decision, reviewerId: payload.reviewerId, reviewedAt: new Date().toISOString() } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this decision.");
      await load();
    } finally {
      setBusyId("");
    }
  }

  const pendingCount = requests.filter((request) => request.status === "PENDING").length;

  return <div className="mx-auto w-full max-w-5xl pb-10 text-white">
    <Link href="/profile" className="inline-flex min-h-10 items-center gap-2 text-sm text-neutral-400 transition hover:text-white"><ArrowLeft size={16} />Back to profile</Link>
    <header className="mt-4 rounded-3xl border border-violet-200/15 bg-gradient-to-br from-[#211c32] to-[#12131a] p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">Private reviewer area</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Recognition requests</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">Review pending requests and decide whether to grant or decline recognition. Only you can make these decisions.</p></div><span className="rounded-full border border-amber-200/20 bg-amber-200/[0.08] px-3 py-1.5 text-xs font-semibold text-amber-100">{pendingCount} awaiting review</span></div>
    </header>

    {error && <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-rose-300/20 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-200">{error}<button type="button" onClick={() => void load()} aria-label="Retry loading requests" className="rounded-lg p-2 hover:bg-white/[0.08]"><LoaderCircle size={16} /></button></div>}
    <section aria-label="Recognition requests" className="mt-4 space-y-3">
      {loading ? <div className="rounded-2xl border border-white/[0.08] bg-[#151518] p-6 text-sm text-neutral-400"><LoaderCircle size={16} className="mr-2 inline animate-spin" />Loading requests…</div>
        : requests.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center"><BadgeCheck size={28} className="mx-auto text-violet-200" /><h2 className="mt-3 font-semibold">No requests yet</h2><p className="mt-1 text-sm text-neutral-500">New requests will appear here.</p></div>
          : requests.map((request) => <article key={request.id} className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#151518] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] text-neutral-300">{request.user.image ? <Image src={request.user.image} alt="" width={44} height={44} unoptimized className="size-full object-cover" /> : <UserRound size={19} />}</span><div className="min-w-0"><h2 className="break-words font-semibold text-white">{request.user.name || "Unnamed account"}</h2><p className="break-all text-sm text-neutral-400">{request.user.email}</p><p className="mt-1 text-xs text-neutral-400">Activity: {request.user.resourceCount} resources · {request.user.completedTaskCount} tasks completed</p><p className="mt-1 text-[11px] text-neutral-500">Account ID: <span className="break-all font-mono">{request.user.id}</span></p></div></div><span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ${request.status === "PENDING" ? "bg-amber-200/10 text-amber-100" : request.status === "APPROVED" ? "bg-violet-200/10 text-violet-100" : request.status === "DECLINED" || request.status === "REVOKED" ? "bg-rose-200/10 text-rose-200" : "bg-white/[0.06] text-neutral-400"}`}>{request.status === "PENDING" ? <Clock3 size={13} /> : request.status === "APPROVED" ? <BadgeCheck size={13} /> : <X size={13} />}{statusLabel[request.status]}</span></div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-3"><p className="text-xs text-neutral-500">Requested {shortDate(request.createdAt)}{request.reviewedAt && <> · Reviewed {shortDate(request.reviewedAt)}</>}<span className="ml-2">· Email {request.user.emailVerified ? "verified" : "not verified"}</span></p><div className="flex flex-wrap gap-2">{request.status === "PENDING" && <><button type="button" disabled={busyId === request.id} onClick={() => void decide(request, "APPROVED")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-200 px-3.5 text-sm font-semibold text-violet-950 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"><BadgeCheck size={15} />{busyId === request.id ? "Saving…" : "Grant recognition"}</button><button type="button" disabled={busyId === request.id} onClick={() => void decide(request, "DECLINED")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3.5 text-sm text-neutral-300 transition hover:bg-white/[0.06] disabled:opacity-50"><X size={15} />Decline</button></>}{request.status === "APPROVED" && <button type="button" disabled={busyId === request.id} onClick={() => void decide(request, "REVOKED")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-300/20 px-3.5 text-sm text-rose-200 transition hover:bg-rose-300/[0.08] disabled:opacity-50"><ShieldX size={15} />{busyId === request.id ? "Saving…" : "Revoke badge"}</button>}</div></div>
          </article>)}
    </section>
  </div>;
}

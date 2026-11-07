"use client";

import { MailCheck } from "lucide-react";
import { ResendVerification } from "@/components/auth/resend-verification";

/** Shown right after sign-up: the account exists, the link is on its way. */
export function CheckEmail({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  return (
    <div role="status" aria-live="polite">
      <span className="grid size-12 place-items-center rounded-2xl bg-yellow-400/10 text-yellow-400">
        <MailCheck size={24} aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">Check your email</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        We sent a verification link to <span className="break-all font-medium text-zinc-200">{email}</span>. Open it on
        this device to finish creating your account.
      </p>
      <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs leading-5 text-zinc-400">
        Can&apos;t see it? Check your spam or promotions folder. It can take a minute to arrive.
      </p>
      <div className="mt-5">
        <ResendVerification email={email} initialCooldown={30} />
      </div>
      <button
        type="button"
        onClick={onChangeEmail}
        className="mt-1 h-11 w-full rounded-xl text-sm text-zinc-500 transition hover:text-zinc-200"
      >
        Use a different email
      </button>
    </div>
  );
}

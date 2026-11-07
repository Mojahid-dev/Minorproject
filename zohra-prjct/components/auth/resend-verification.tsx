"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

/** "Resend email" button with a cooldown, so the link can't be spammed. */
export function ResendVerification({
  email,
  initialCooldown = 0,
}: {
  email: string;
  /** Seconds to wait before the first resend (use when an email was just sent). */
  initialCooldown?: number;
}) {
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    setStatus("sending");
    setError("");
    const result = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
    if (result.error) {
      setStatus("error");
      setError(result.error.message ?? "We couldn't send the email. Please try again in a minute.");
      return;
    }
    setStatus("sent");
    setCooldown(60);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void resend()}
        disabled={status === "sending" || cooldown > 0}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] px-4 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
      </button>
      <p className="mt-2 min-h-5 text-center text-xs" role="status" aria-live="polite">
        {status === "sent" && cooldown > 0 ? <span className="text-emerald-400">A new link is on its way.</span> : null}
        {status === "error" ? <span className="text-red-300">{error}</span> : null}
      </p>
    </div>
  );
}

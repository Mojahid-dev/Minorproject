"use client";

import Link from "next/link";
import { ArrowLeft, Bell, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [focusMode, setFocusMode] = useState(false);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-neutral-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-neutral-400 transition hover:bg-white/10 hover:text-white">
          <ArrowLeft size={17} /> Back to dashboard
        </Link>

        <header className="mt-8 border-b border-zinc-800 pb-7">
          <p className="text-sm font-medium text-neutral-500">Account & workspace</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-white">Settings</h1>
          <p className="mt-2 text-sm text-neutral-500">Manage your Zohra account and workspace preferences.</p>
        </header>

        <div className="mt-6 space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-white text-black"><UserRound size={18} /></div><div><h2 className="font-semibold text-white">Profile</h2><p className="text-sm text-neutral-500">Your account details.</p></div></div>
            <div className="mt-5 flex items-center gap-3 border-t border-zinc-800 pt-5"><div className="grid size-11 place-items-center rounded-full bg-white text-sm font-bold text-black">ZA</div><div><p className="font-medium text-white">Zohra Admin</p><p className="text-sm text-neutral-500">admin@zohra.app</p></div></div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-white text-black"><Bell size={18} /></div><div><h2 className="font-semibold text-white">Notifications</h2><p className="text-sm text-neutral-500">Control project and task updates.</p></div></div>
            <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 border-t border-zinc-800 pt-5"><span><span className="block text-sm font-medium text-white">Email notifications</span><span className="mt-1 block text-sm text-neutral-500">Receive workspace activity updates by email.</span></span><input checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)} type="checkbox" className="size-5 accent-white" /></label>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-white text-black"><ShieldCheck size={18} /></div><div><h2 className="font-semibold text-white">Focus mode</h2><p className="text-sm text-neutral-500">Keep distractions to a minimum.</p></div></div>
            <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 border-t border-zinc-800 pt-5"><span><span className="block text-sm font-medium text-white">Enable focus mode</span><span className="mt-1 block text-sm text-neutral-500">Mute non-essential dashboard alerts.</span></span><input checked={focusMode} onChange={(event) => setFocusMode(event.target.checked)} type="checkbox" className="size-5 accent-white" /></label>
          </section>
        </div>
      </div>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Mail, Settings2, UserRound } from "lucide-react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;

  if (!user) return null;

  const joinedOn = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(user.createdAt));

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-7">
        <div>
          <p className="text-sm font-medium text-neutral-500">Your account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-white">
            Profile
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            View your account details and manage your profile.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3.5 py-2.5 text-sm font-semibold text-neutral-300 transition hover:bg-white/10 hover:text-white"
        >
          <Settings2 size={17} /> Edit profile
        </Link>
      </header>

      <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="h-28 bg-gradient-to-r from-zinc-800 to-zinc-950" />
        <div className="px-5 pb-6 sm:px-6">
          <div className="-mt-12 grid size-24 place-items-center overflow-hidden rounded-full border-4 border-zinc-900 bg-white text-2xl font-bold text-black">
            {user.image ? (
              <Image
                src={user.image}
                alt={`${user.name}'s profile photo`}
                width={96}
                height={96}
                unoptimized
                className="size-full object-cover"
              />
            ) : (
              initials(user.name)
            )}
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.035em] text-white">
            {user.name}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">Zohra workspace member</p>

          <dl className="mt-6 grid gap-3 border-t border-zinc-800 pt-5 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-zinc-950/70 p-4">
              <Mail size={18} className="text-neutral-400" />
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Email</dt>
                <dd className="truncate text-sm text-white">{user.email}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-zinc-950/70 p-4">
              <CalendarDays size={18} className="text-neutral-400" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Member since</dt>
                <dd className="text-sm text-white">{joinedOn}</dd>
              </div>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-white text-black">
            <UserRound size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-white">Profile settings</h2>
            <p className="text-sm text-neutral-500">Update your name and profile photo.</p>
          </div>
        </div>
        <Link
          href="/settings"
          className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
        >
          Manage profile
        </Link>
      </section>
    </div>
  );
}


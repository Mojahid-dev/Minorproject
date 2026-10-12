import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Award, BadgeCheck, BookOpen, CalendarDays, CheckCircle2, FileStack, Mail, Settings2, ShieldCheck, Sparkles, Target, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { isRecognitionReviewer } from "@/lib/recognition-admin";
import { prisma } from "@/lib/prisma";
import { RecognitionRequestCard } from "@/components/recognition/request-card";

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
}

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/");

  const [resourceCount, completedTaskCount, activeTaskCount, recentResources, latestRecognition] = await Promise.all([
    prisma.resource.count({ where: { userId: user.id } }),
    prisma.task.count({ where: { userId: user.id, completedAt: { not: null } } }),
    prisma.task.count({ where: { userId: user.id, completedAt: null } }),
    prisma.resource.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, originalName: true, mimeType: true, createdAt: true } }),
    prisma.recognitionRequest.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, createdAt: true, reviewedAt: true } }),
  ]);
  const joinedOn = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(user.createdAt));
  const totalTasks = completedTaskCount + activeTaskCount;
  const completionPercent = totalTasks ? Math.round((completedTaskCount / totalTasks) * 100) : 0;
  const recognitionRequest = latestRecognition ? {
    ...latestRecognition,
    createdAt: latestRecognition.createdAt.toISOString(),
    reviewedAt: latestRecognition.reviewedAt?.toISOString() ?? null,
  } : null;
  const recognitionEligibleAt = latestRecognition?.status === "DECLINED" && latestRecognition.reviewedAt
    ? new Date(latestRecognition.reviewedAt.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  return (
    <div className="mx-auto max-w-6xl pb-10 text-white">
      <header className="mb-5 flex flex-col items-stretch justify-between gap-4 sm:mb-7 sm:flex-row sm:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Your corner of Zohra</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Profile</h1><p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">A view of who you are here and the learning space you’ve been building.</p></div>
        <Link href="/settings#profile-settings" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10 sm:flex-none"><Settings2 size={16} /> Edit profile <ArrowRight size={15} /></Link>
      </header>

      <section className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#111117] shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_10%_0%,rgba(139,92,246,0.24),transparent_42%),radial-gradient(ellipse_at_90%_10%,rgba(56,189,248,0.15),transparent_40%),linear-gradient(135deg,#1b1b25,#101014_55%,#15151b)]" />
        <div aria-hidden="true" className="absolute -right-20 -top-32 size-80 rounded-full border border-white/[0.07]" />
        <div aria-hidden="true" className="absolute -right-6 -top-20 size-52 rounded-full border border-white/[0.06]" />
        <div className="relative flex flex-col gap-5 p-4 sm:gap-7 sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-[24px] border border-white/20 bg-gradient-to-br from-violet-200 to-sky-200 text-2xl font-bold text-zinc-950 shadow-[0_14px_40px_rgba(0,0,0,0.3)] sm:size-32 sm:rounded-[30px] sm:text-3xl">
              {user.image ? <Image src={user.image} alt={`${user.name}'s profile photo`} width={128} height={128} unoptimized className="size-full object-cover" /> : initials(user.name)}
              <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-4 border-[#17171d] bg-emerald-400 text-zinc-950"><CheckCircle2 size={14} strokeWidth={3} /></span>
            </div>
            <div className="min-w-0 pb-1">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-violet-100"><Sparkles size={12} /> Personal workspace</div>
              <h2 className="break-words text-2xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">{user.name}</h2>
              {latestRecognition?.status === "APPROVED" && <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-violet-200/25 bg-violet-200/10 px-2.5 py-1 text-xs font-semibold text-violet-100"><Award size={14} />Zohra Recognized</span>}
              <p className="mt-2 flex items-center gap-2 text-sm text-neutral-300"><Mail size={15} className="text-neutral-400" /><span className="break-all">{user.email}</span>{user.emailVerified && <BadgeCheck size={16} className="shrink-0 text-sky-300" aria-label="Email verified" />}</p>
              <p className="mt-2 text-xs text-neutral-400">Member since {joinedOn}</p>
            </div>
          </div>
          <Link href="/dashboard" className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-100 lg:w-auto">Go to overview <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-3 border-t border-white/[0.08] bg-black/15">
          <ProfileStat icon={FileStack} label="Resources collected" value={resourceCount} detail="Materials in your library" />
          <ProfileStat icon={CheckCircle2} label="Tasks completed" value={completedTaskCount} detail={totalTasks ? `${completionPercent}% of your tasks` : "Your first win is waiting"} />
          <ProfileStat icon={Target} label="Still in progress" value={activeTaskCount} detail={activeTaskCount ? "Keep your next step in view" : "No open tasks right now"} />
        </div>
      </section>

      <div className="mt-4 sm:mt-5"><RecognitionRequestCard initialRequest={recognitionRequest} initialEligibleAt={recognitionEligibleAt} /></div>
      {isRecognitionReviewer(user.id) && <Link href="/admin/recognition" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-200/15 px-3.5 text-sm font-medium text-violet-100 transition hover:bg-violet-200/[0.08]"><ShieldCheck size={16} />Review recognition requests<ArrowRight size={15} /></Link>}

      <div className="mt-4 grid gap-3 sm:mt-5 sm:gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#17181c] to-[#101114] p-4 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Your learning space</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">A little momentum adds up.</h2><p className="mt-2 max-w-lg text-sm leading-6 text-neutral-400">Your materials and tasks stay together, so it’s easy to pick up where you left off.</p></div><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-200"><BookOpen size={19} /></span></div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-label="Completed tasks" aria-valuemin={0} aria-valuemax={totalTasks || 1} aria-valuenow={completedTaskCount}><div className="h-full rounded-full bg-gradient-to-r from-violet-300 via-sky-200 to-emerald-200 transition-all" style={{ width: `${completionPercent}%` }} /></div>
          <div className="mt-2 flex justify-between text-xs text-neutral-400"><span>{completedTaskCount} completed</span><span>{activeTaskCount} active</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><Link href="/resources" className="group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition hover:border-violet-200/25 hover:bg-white/[0.04]"><span><span className="block text-sm font-semibold text-neutral-100">Browse resources</span><span className="mt-1 block text-xs text-neutral-400">Return to your study materials</span></span><ArrowRight size={16} className="text-neutral-500 transition group-hover:translate-x-1 group-hover:text-white" /></Link><Link href="/tasks" className="group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition hover:border-sky-200/25 hover:bg-white/[0.04]"><span><span className="block text-sm font-semibold text-neutral-100">Open your planner</span><span className="mt-1 block text-xs text-neutral-400">See what’s next</span></span><ArrowRight size={16} className="text-neutral-500 transition group-hover:translate-x-1 group-hover:text-white" /></Link></div>
        </section>

        <section className="rounded-3xl border border-white/[0.08] bg-[#141518] p-4 sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Latest additions</p><h2 className="mt-2 text-xl font-semibold">Your library</h2></div><Link href="/resources" aria-label="View all resources" className="grid size-9 place-items-center rounded-xl text-neutral-400 hover:bg-white/10 hover:text-white"><ArrowRight size={17} /></Link></div>
          {recentResources.length ? <ul className="mt-5 space-y-2">{recentResources.map((resource) => <li key={resource.id}><Link href="/resources" className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 transition hover:bg-white/[0.05]"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-neutral-200"><FileStack size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-neutral-200">{resource.originalName}</span><span className="mt-1 block text-xs text-neutral-500">{resource.mimeType.split("/").pop()?.toUpperCase()}</span></span><ArrowRight size={14} className="shrink-0 text-neutral-600" /></Link></li>)}</ul> : <div className="mt-5 rounded-2xl border border-dashed border-zinc-700 p-5 text-center"><p className="text-sm text-neutral-300">Your library is ready for its first resource.</p><Link href="/upload" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-violet-200 hover:text-white">Add a resource <ArrowRight size={14} /></Link></div>}
          <div className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-5"><span className="grid size-9 place-items-center rounded-xl bg-white/[0.06] text-neutral-300"><CalendarDays size={16} /></span><div><p className="text-xs text-neutral-500">Your membership</p><p className="mt-0.5 text-sm font-medium text-neutral-200">Started {joinedOn}</p></div></div>
        </section>
      </div>
      <p className="mt-5 flex items-center gap-2 px-1 text-xs text-neutral-500"><UserRound size={14} /> Your account details are private to your workspace.</p>
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value, detail }: { icon: typeof FileStack; label: string; value: number; detail: string }) {
  return <div className="min-w-0 p-3 sm:flex sm:items-center sm:gap-3 sm:p-5 sm:[&:not(:last-child)]:border-r"><span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-neutral-200 sm:grid"><Icon size={18} /></span><div className="min-w-0"><p className="min-h-8 text-[10px] leading-3 text-neutral-400 sm:min-h-0 sm:text-xs sm:leading-normal">{label}</p><div className="mt-0.5"><span className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{value}</span><span className="hidden truncate text-[11px] text-neutral-500 sm:ml-2 sm:inline">{detail}</span></div></div></div>;
}

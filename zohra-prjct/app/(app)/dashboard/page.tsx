import { BookOpen, Clock3, Compass, Sparkles } from "lucide-react";

export default function DashboardPage() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-500">
            Thursday, July 31
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.045em] text-white">
            Good morning, Zohra <span aria-hidden="true">✦</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Here’s a focused view of what needs your attention today.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3.5 py-2.5 text-sm font-semibold text-neutral-300 transition hover:bg-white/10 hover:text-white">
          <Compass size={17} />
          Explore workspace
        </button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <Sparkles size={20} className="text-white" />
          <p className="mt-7 text-sm text-neutral-500">
            Your workspace is ready
          </p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white">
            Navigation complete
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 p-5">
          <BookOpen size={20} className="text-neutral-300" />
          <p className="mt-7 text-sm text-neutral-500">Next up</p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white">
            Build your dashboard
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-400">
              <Clock3 size={17} /> Recently opened
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
              Recent
            </h2>
          </div>
          <span className="rounded-lg border border-zinc-800 px-2.5 py-1 text-xs font-medium text-neutral-500">
            Coming soon
          </span>
        </div>

        <div className="mt-6 space-y-3" aria-label="Recent items loading">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="flex items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3.5"
            >
              <div className="size-10 shrink-0 animate-pulse rounded-xl bg-zinc-800" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-2/5 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-zinc-800/70" />
              </div>
              <div className="hidden h-3 w-16 animate-pulse rounded bg-zinc-800/70 sm:block" />
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-neutral-500">
          Your recently opened resources and projects will appear here.
        </p>
      </section>
    </>
  );
}

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-24 text-white sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-yellow-400">About Atlas</p>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          A calmer way to work.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-zinc-400">
          Atlas brings clarity to your work with a polished workspace built for focus, momentum, and thoughtful execution.
        </p>
        <Link href="/" className="inline-flex w-fit items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-yellow-500/30 hover:bg-yellow-500/10 hover:text-white">
          Back to home
        </Link>
      </div>
    </main>
  );
}

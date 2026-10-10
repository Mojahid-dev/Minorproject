import Link from "next/link";

export default function Footer() {
  return <footer className="border-t border-white/10 bg-zinc-950 px-5 py-10 text-zinc-400 sm:px-8 lg:px-12">
    <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-semibold text-white">Zohra</p><p className="mt-1 text-sm">A personal home for your project resources.</p></div>
      <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><Link href="/about" className="hover:text-white">About</Link><Link href="/pricing" className="hover:text-white">Plans</Link><Link href="/login" className="hover:text-white">Sign in</Link><Link href="/sign-up" className="hover:text-white">Create account</Link></nav>
    </div>
    <p className="mx-auto mt-8 max-w-7xl border-t border-white/[0.07] pt-5 text-xs text-zinc-600">© 2026 Zohra</p>
  </footer>;
}

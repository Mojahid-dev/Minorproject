import Link from "next/link";
import { ArrowRight, FileText, ListTodo, Search, ShieldCheck } from "lucide-react";
import Footer from "@/app/(marketing)/_components/footer";
import Navbar from "@/app/(marketing)/_components/navbar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const features = [
  { icon: FileText, title: "A private resource library", description: "Keep your project documents, presentations, text files, and images together in one personal library." },
  { icon: Search, title: "Find files by name", description: "Search your library, filter by file type, and sort by name or date added." },
  { icon: ListTodo, title: "Personal task tracking", description: "Create tasks with due dates and priorities, then see what is due today or overdue." },
  { icon: ShieldCheck, title: "PDF text extraction", description: "Extract selectable text from uploaded PDFs. Scanned PDFs remain available, with text extraction marked as unavailable." },
];

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-white">
    <Navbar />
    <section className="relative px-5 pb-20 pt-36 sm:px-8 sm:pt-44 lg:px-12 lg:pb-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[540px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(234,179,8,0.12),transparent_60%)]" />
      <div className="relative mx-auto max-w-5xl text-center">
        <p className="inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/[0.06] px-3.5 py-1.5 text-xs font-medium tracking-wide text-yellow-300">A personal workspace for your project files</p>
        <h1 className="mx-auto mt-7 max-w-4xl text-balance text-5xl font-semibold tracking-[-0.06em] sm:text-6xl lg:text-7xl">Your resources, tasks, and progress in one place.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-zinc-400">Upload and organize the files behind your work, search your library, and keep a simple list of personal tasks. Zohra extracts selectable text from PDFs so it is easier to revisit.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-300">Create your account <ArrowRight size={16} /></Link>
          <Link href="/login" className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.05]">Sign in</Link>
        </div>
      </div>
      <div className="mx-auto mt-16 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl border border-white/[0.08] bg-zinc-900/55 p-5"><span className="grid size-10 place-items-center rounded-xl bg-yellow-400/10 text-yellow-300"><Icon size={20} /></span><h2 className="mt-5 text-base font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p></article>)}
      </div>
    </section>
    <Footer />
  </main>;
}

import Link from "next/link";
import Navbar from "@/app/(marketing)/_components/navbar";
import Footer from "@/app/(marketing)/_components/footer";

export default function AboutPage() {
  return <main className="min-h-screen bg-zinc-950 pt-24 text-white">
    <Navbar />
    <section className="px-5 py-16 sm:px-8 lg:px-12">
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/" className="text-sm font-medium text-yellow-300 hover:text-yellow-200">Zohra</Link>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-yellow-400">About</p>
      <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">A personal home for your project resources.</h1>
      <p className="max-w-2xl text-lg leading-8 text-zinc-400">Zohra brings file organization and lightweight task tracking into one signed-in workspace. Upload supported files, search and filter your library, revisit extracted PDF text, and keep track of your next tasks.</p>
      <p className="max-w-2xl text-base leading-7 text-zinc-500">The current product is built for individual use. Each account has a private resource library and personal task list.</p>
      <Link href="/sign-up" className="inline-flex w-fit items-center rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-300">Create an account</Link>
    </div>
    </section>
    <Footer />
  </main>;
}

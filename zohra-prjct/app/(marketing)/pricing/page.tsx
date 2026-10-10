import Link from "next/link";
import Navbar from "@/app/(marketing)/_components/navbar";
import Footer from "@/app/(marketing)/_components/footer";

export default function PricingPage() {
  return <main className="min-h-screen bg-zinc-950 pt-24 text-white">
    <Navbar />
    <section className="px-5 py-16 sm:px-8 lg:px-12">
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/" className="text-sm font-medium text-yellow-300 hover:text-yellow-200">Zohra</Link>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-yellow-400">Plans</p>
      <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Pricing is not available yet.</h1>
      <p className="max-w-2xl text-lg leading-8 text-zinc-400">Zohra is currently focused on its personal resource library and task workflow. There are no paid plans or billing features to choose from yet.</p>
      <Link href="/sign-up" className="inline-flex w-fit items-center rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-300">Create an account</Link>
    </div>
    </section>
    <Footer />
  </main>;
}

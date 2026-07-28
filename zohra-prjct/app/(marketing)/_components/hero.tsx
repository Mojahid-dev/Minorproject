import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import AtlasConstellation from "@/app/(marketing)/_components/atlas-constellation";

// Replace these placeholder values when your final messaging is ready.
const heroContent = {
  eyebrow: "YOUR PRODUCT CATEGORY",
  title: "A clear promise your visitors will remember.",
  highlight: "Make it unmistakable.",
  description: "Use this short space to explain the problem your project solves and why it matters. Keep it focused, helpful, and true to your voice.",
  primaryCta: "Get started",
  secondaryCta: "See how it works",
  previewLabel: "YOUR PRODUCT PREVIEW",
};

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-zinc-950 px-5 pb-12 pt-36 text-white sm:px-8 lg:min-h-screen lg:px-12 lg:pb-16 lg:pt-40">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_0%,rgba(202,138,4,0.18),transparent_34%),radial-gradient(circle_at_10%_40%,rgba(161,98,7,0.10),transparent_26%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      <AtlasConstellation />

      <div className="mx-auto flex w-full max-w-7xl flex-col items-center">
        <div className="flex items-center gap-2 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium tracking-[0.16em] text-yellow-400"><Sparkles size={14} aria-hidden="true" />{heroContent.eyebrow}</div>
        <div className="mt-7 max-w-4xl text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">{heroContent.title}<span className="block bg-gradient-to-r from-yellow-200 via-yellow-500 to-amber-600 bg-clip-text text-transparent">{heroContent.highlight}</span></h2>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-zinc-400 sm:text-lg">{heroContent.description}</p>
        </div>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/sign-up" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:scale-[1.02] hover:bg-yellow-400 sm:w-auto">{heroContent.primaryCta}<ArrowRight size={16} aria-hidden="true" /></Link>
          <a href="#product-preview" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-yellow-500/40 hover:bg-white/[0.07] sm:w-auto"><Play size={15} fill="currentColor" aria-hidden="true" />{heroContent.secondaryCta}</a>
        </div>
        <div id="product-preview" className="relative mt-14 w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.5)] sm:mt-16 sm:p-3">
          <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent" />
          <div className="rounded-xl border border-white/8 bg-zinc-950 p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-white/8 pb-4"><div className="flex gap-1.5" aria-hidden="true"><span className="size-2.5 rounded-full bg-red-400/70" /><span className="size-2.5 rounded-full bg-yellow-400/70" /><span className="size-2.5 rounded-full bg-emerald-400/70" /></div><span className="text-[10px] font-medium tracking-[0.16em] text-zinc-500">{heroContent.previewLabel}</span><span className="w-10" /></div>
            {/* Replace this placeholder frame with an Image, video, or interactive product UI. */}
            <div className="mt-4 grid min-h-[260px] place-items-center rounded-lg border border-dashed border-yellow-500/25 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.10),transparent_55%)] p-6 sm:min-h-[340px]"><div className="max-w-sm text-center"><div className="mx-auto grid size-12 place-items-center rounded-xl border border-yellow-500/25 bg-yellow-500/10 text-yellow-400"><Sparkles size={22} aria-hidden="true" /></div><p className="mt-4 text-sm font-semibold text-zinc-200">Drop in your showcase</p><p className="mt-2 text-sm leading-6 text-zinc-500">Add a screenshot, dashboard, video, or custom visual here to introduce your product.</p></div></div>
          </div>
        </div>
      </div>
    </section>
  );
}

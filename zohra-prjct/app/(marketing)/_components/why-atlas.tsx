type PrincipleKind = "focus" | "connected" | "speed" | "lasting" | "minimal";

type Principle = {
  number: string;
  title: string;
  description: string;
  kind: PrincipleKind;
};

const principles: Principle[] = [
  { number: "01", title: "Focused by design", description: "Everything has a purpose. Nothing competes for your attention.", kind: "focus" },
  { number: "02", title: "Connected workflow", description: "Your notes, projects, resources, and tasks belong together.", kind: "connected" },
  { number: "03", title: "Built for flow", description: "A responsive interface that keeps up with your train of thought.", kind: "speed" },
  { number: "04", title: "Designed to last", description: "A reliable home for work that grows more valuable over time.", kind: "lasting" },
  { number: "05", title: "Minimal by default", description: "Calm surfaces and clear decisions leave room for the work itself.", kind: "minimal" },
];

function PrincipleVisual({ kind }: { kind: PrincipleKind }) {
  if (kind === "focus") return <div className="flex h-14 items-center justify-center rounded-lg border border-white/8 bg-zinc-950/60"><div className="h-1.5 w-20 rounded-full bg-yellow-500" /><div className="ml-2 h-1.5 w-6 rounded-full bg-zinc-800" /></div>;
  if (kind === "connected") return <div className="relative flex h-14 items-center justify-center gap-4 rounded-lg border border-white/8 bg-zinc-950/60"><span className="grid size-5 place-items-center rounded border border-white/10 text-[8px] text-zinc-500">N</span><span className="h-px w-7 bg-yellow-500/60" /><span className="grid size-6 place-items-center rounded bg-yellow-500 text-[9px] font-bold text-zinc-950">A</span><span className="h-px w-7 bg-yellow-500/60" /><span className="grid size-5 place-items-center rounded border border-white/10 text-[8px] text-zinc-500">T</span></div>;
  if (kind === "speed") return <div className="flex h-14 items-center gap-2 rounded-lg border border-white/8 bg-zinc-950/60 p-3"><span className="h-2 w-2 rounded-full bg-yellow-500" /><span className="h-1.5 w-10 rounded-full bg-zinc-700" /><span className="h-1.5 flex-1 rounded-full bg-zinc-800" /><span className="h-1.5 w-7 rounded-full bg-zinc-700" /></div>;
  if (kind === "lasting") return <div className="flex h-14 items-center justify-center rounded-lg border border-white/8 bg-zinc-950/60"><span className="grid size-8 place-items-center rounded-full border border-yellow-500/40 text-[10px] text-yellow-400">∞</span></div>;
  return <div className="flex h-14 items-center justify-center gap-1.5 rounded-lg border border-white/8 bg-zinc-950/60"><span className="size-2 rounded-full bg-yellow-500" /><span className="size-2 rounded-full bg-zinc-700" /><span className="size-2 rounded-full bg-zinc-700" /></div>;
}

function PrincipleRow({ principle }: { principle: Principle }) {
  return <article className="group grid gap-4 border-t border-white/8 py-5 transition sm:grid-cols-[42px_1fr_180px] sm:items-center sm:gap-6 sm:py-6"><span className="text-xs font-semibold tracking-[0.14em] text-yellow-500">{principle.number}</span><div><h3 className="text-base font-semibold tracking-tight text-zinc-100 transition group-hover:text-yellow-400 sm:text-lg">{principle.title}</h3><p className="mt-1.5 max-w-md text-sm leading-6 text-zinc-500">{principle.description}</p></div><div className="transition duration-300 group-hover:-translate-y-0.5"><PrincipleVisual kind={principle.kind} /></div></article>;
}

export default function WhyAtlas() {
  return <section id="why-atlas" aria-labelledby="why-atlas-heading" className="border-t border-white/8 bg-zinc-950 px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-32"><div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.75fr_1.25fr] lg:gap-20"><header className="max-w-xl lg:pt-3"><span className="inline-flex rounded-full border border-yellow-500/25 bg-yellow-500/[0.07] px-3 py-1.5 text-xs font-medium tracking-[0.14em] text-yellow-400">WHY ATLAS</span><h2 id="why-atlas-heading" className="mt-5 text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">Less to manage.<br /><span className="text-zinc-500">More room to think.</span></h2><p className="mt-6 max-w-md text-pretty text-base leading-7 text-zinc-400">Atlas is not built to fill every moment with more productivity. It is built to make the work you care about feel calmer, clearer, and easier to return to.</p><div className="mt-10 hidden h-px w-24 bg-yellow-500/60 lg:block" /></header><div className="border-b border-white/8">{principles.map((principle) => <PrincipleRow key={principle.number} principle={principle} />)}</div></div></section>;
}

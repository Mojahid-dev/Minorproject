type ShowcaseCalloutData = {
  label: string;
  detail: string;
  mark: string;
  position: string;
  delay: string;
};

const showcaseCallouts: ShowcaseCalloutData[] = [
  { label: "Notes", detail: "Ideas stay with their context.", mark: "N", position: "left-0 top-[19%]", delay: "[animation-delay:-1.8s]" },
  { label: "Resources", detail: "Everything worth returning to.", mark: "R", position: "right-0 top-[31%]", delay: "[animation-delay:-4.1s]" },
  { label: "Calendar", detail: "A week with room to think.", mark: "C", position: "bottom-[15%] left-[4%]", delay: "[animation-delay:-3s]" },
  { label: "Search", detail: "Find the signal, quickly.", mark: "S", position: "bottom-[8%] right-[5%]", delay: "[animation-delay:-5.2s]" },
];

function ShowcaseCallout({ label, detail, mark, position, delay }: ShowcaseCalloutData) {
  return (
    <article className={`absolute ${position} ${delay} motion-safe:animate-atlas-drift z-20 flex w-44 items-start gap-2.5 rounded-lg border border-white/10 bg-zinc-900/95 p-3 shadow-[0_14px_35px_rgba(0,0,0,0.34)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-yellow-500/30`}>
      <span className="grid size-6 shrink-0 place-items-center rounded bg-yellow-500/10 text-[10px] font-semibold text-yellow-400">{mark}</span>
      <span><span className="block text-xs font-semibold text-zinc-200">{label}</span><span className="mt-0.5 block text-[11px] leading-4 text-zinc-500">{detail}</span></span>
    </article>
  );
}

function ProductDashboard() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900 p-2 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
      <div className="flex items-center border-b border-white/8 px-3 py-2.5" aria-hidden="true"><div className="flex gap-1.5"><span className="size-1.5 rounded-full bg-zinc-600" /><span className="size-1.5 rounded-full bg-zinc-600" /><span className="size-1.5 rounded-full bg-zinc-600" /></div><span className="mx-auto text-[10px] font-semibold tracking-[0.16em] text-yellow-500">ATLAS</span><span className="w-7" /></div>
      <div className="grid min-h-[400px] grid-cols-[108px_1fr] sm:min-h-[530px] sm:grid-cols-[142px_1fr]">
        <aside className="border-r border-white/8 p-3 sm:p-4">
          <div className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded bg-yellow-500 text-[10px] font-bold text-zinc-950">A</span><span className="hidden text-xs font-semibold text-zinc-200 sm:inline">Atlas</span></div>
          <nav aria-label="Atlas product preview navigation" className="mt-7 space-y-1"><p className="mb-2 px-2 text-[9px] font-semibold tracking-[0.15em] text-zinc-600">WORKSPACE</p>{["Home", "Notes", "Projects", "Resources", "Calendar"].map((item, index) => <span key={item} className={`block rounded-md px-2 py-1.5 text-[10px] sm:text-xs ${index === 0 ? "bg-yellow-500/10 text-yellow-400" : "text-zinc-500"}`}>{item}</span>)}</nav>
          <div className="mt-7 border-t border-white/8 pt-3"><p className="px-2 text-[9px] font-semibold tracking-[0.15em] text-zinc-600">COLLECTIONS</p><span className="mt-2 block px-2 text-[10px] text-zinc-500">Biology 101</span><span className="mt-2 block px-2 text-[10px] text-zinc-500">Personal</span></div>
        </aside>
        <main className="min-w-0 p-4 sm:p-6">
          <header className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-medium tracking-[0.1em] text-zinc-500">MONDAY, SEPTEMBER 09</p><h3 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-2xl">Your work, in flow.</h3><p className="mt-1 text-[11px] text-zinc-500 sm:text-xs">A thoughtful view of everything ahead.</p></div><button type="button" className="rounded-md border border-white/10 px-2.5 py-1.5 text-[10px] font-medium text-zinc-400 transition hover:border-yellow-500/30 hover:text-yellow-400">⌘ K</button></header>
          <div className="mt-6 grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
            <section aria-label="Today’s focus" className="rounded-lg border border-yellow-500/20 bg-zinc-950/60 p-3 sm:p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold tracking-[0.12em] text-yellow-500">TODAY’S FOCUS</span><span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-medium text-yellow-400">02 / 04</span></div><h4 className="mt-4 text-xs font-semibold text-zinc-100 sm:text-sm">Complete the cell membrane summary</h4><p className="mt-2 text-[10px] leading-4 text-zinc-500">One note, three saved references, and tomorrow’s study block—connected in one place.</p><div className="mt-4 h-1.5 rounded-full bg-zinc-800"><div className="h-full w-[68%] rounded-full bg-yellow-500" /></div></section>
            <section aria-label="Upcoming event" className="rounded-lg border border-white/8 bg-zinc-950/60 p-3 sm:p-4"><span className="text-[10px] font-semibold tracking-[0.12em] text-zinc-500">UP NEXT</span><p className="mt-4 text-xs font-semibold text-zinc-200">Research seminar</p><p className="mt-1 text-[10px] text-zinc-500">Tomorrow · 10:30 AM</p><div className="mt-5 border-t border-white/8 pt-3 text-[10px] text-yellow-500">Open preparation ↗</div></section>
          </div>
          <section aria-label="Recent workspace activity" className="mt-3 rounded-lg border border-white/8 bg-zinc-950/60 p-3 sm:p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold tracking-[0.12em] text-zinc-500">RECENTLY CONNECTED</span><span className="text-[10px] text-yellow-500">See all</span></div><div className="mt-3 grid grid-cols-3 gap-2"><article className="rounded-md border border-white/8 bg-zinc-900 p-2.5"><span className="text-[9px] text-zinc-500">NOTE</span><p className="mt-1 truncate text-[10px] font-medium text-zinc-300">Cell biology</p></article><article className="rounded-md border border-white/8 bg-zinc-900 p-2.5"><span className="text-[9px] text-zinc-500">RESOURCE</span><p className="mt-1 truncate text-[10px] font-medium text-zinc-300">Lecture PDF</p></article><article className="rounded-md border border-white/8 bg-zinc-900 p-2.5"><span className="text-[9px] text-zinc-500">PROJECT</span><p className="mt-1 truncate text-[10px] font-medium text-zinc-300">Lab report</p></article></div></section>
          <section aria-label="Weekly calendar" className="mt-3 rounded-lg border border-white/8 bg-zinc-950/60 p-3 sm:p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold tracking-[0.12em] text-zinc-500">THIS WEEK</span><span className="text-[10px] text-zinc-600">September</span></div><div className="mt-3 grid grid-cols-5 gap-1.5"><span className="rounded bg-zinc-900 p-1.5 text-center text-[9px] text-zinc-500">M</span><span className="rounded bg-yellow-500 p-1.5 text-center text-[9px] font-semibold text-zinc-950">T</span><span className="rounded bg-zinc-900 p-1.5 text-center text-[9px] text-zinc-500">W</span><span className="rounded bg-zinc-900 p-1.5 text-center text-[9px] text-zinc-500">T</span><span className="rounded bg-zinc-900 p-1.5 text-center text-[9px] text-zinc-500">F</span></div></section>
        </main>
      </div>
    </div>
  );
}

export default function ProductShowcase() {
  return (
    <section id="product" aria-labelledby="product-heading" className="overflow-hidden border-y border-white/8 bg-zinc-950 px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-2xl text-center"><span className="inline-flex rounded-full border border-yellow-500/25 bg-yellow-500/[0.07] px-3 py-1.5 text-xs font-medium tracking-[0.14em] text-yellow-400">INSIDE ATLAS</span><h2 id="product-heading" className="mt-5 text-balance text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">A workspace you will want to return to.</h2><p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-zinc-400">Made for the moments between thinking and doing—when every note, plan, and resource should already be exactly where you need it.</p></header>
        <div className="relative mx-auto mt-12 max-w-6xl lg:mt-16 lg:px-20"><div className="absolute inset-x-[17%] top-0 h-px bg-yellow-500/45" aria-hidden="true" /><div className="motion-safe:animate-atlas-reveal relative z-10 pt-3"><ProductDashboard /></div><div className="hidden lg:block">{showcaseCallouts.map((callout) => <ShowcaseCallout key={callout.label} {...callout} />)}</div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:hidden">{showcaseCallouts.map((callout) => <div key={callout.label} className="flex items-start gap-3 rounded-lg border border-white/10 bg-zinc-900/70 p-3"><span className="grid size-6 shrink-0 place-items-center rounded bg-yellow-500/10 text-[10px] font-semibold text-yellow-400">{callout.mark}</span><span><span className="block text-xs font-semibold text-zinc-200">{callout.label}</span><span className="mt-0.5 block text-[11px] text-zinc-500">{callout.detail}</span></span></div>)}</div>
        <div className="mt-10 text-center"><a href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:scale-[1.02] hover:bg-yellow-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400">Explore Atlas <span aria-hidden="true">→</span></a></div>
      </div>
    </section>
  );
}

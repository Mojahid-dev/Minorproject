type ToolCardData = {
  name: string;
  mark: string;
  position: string;
  delay: string;
};

const scatteredTools: ToolCardData[] = [
  { name: "Notes", mark: "N", position: "left-3 top-7 sm:left-7", delay: "[animation-delay:-1.4s]" },
  { name: "PDF Reader", mark: "P", position: "right-3 top-16 sm:right-8", delay: "[animation-delay:-4.2s]" },
  { name: "Drive", mark: "D", position: "left-8 top-[43%] sm:left-14", delay: "[animation-delay:-2.7s]" },
  { name: "Calendar", mark: "C", position: "right-7 top-[48%] sm:right-14", delay: "[animation-delay:-5.4s]" },
  { name: "Bookmarks", mark: "B", position: "bottom-10 left-3 sm:left-8", delay: "[animation-delay:-3.3s]" },
  { name: "Tasks", mark: "T", position: "bottom-7 right-3 sm:right-8", delay: "[animation-delay:-.8s]" },
];

function ToolCard({ name, mark, position, delay }: ToolCardData) {
  return (
    <div
      className={`absolute ${position} ${delay} motion-safe:animate-atlas-float flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-2 text-xs font-medium text-zinc-300 shadow-[0_12px_30px_rgba(0,0,0,0.28)] sm:px-3`}
    >
      <span className="grid size-5 place-items-center rounded bg-zinc-800 text-[10px] font-semibold text-yellow-400">{mark}</span>
      <span>{name}</span>
    </div>
  );
}

function ScatteredTools() {
  return (
    <div className="relative min-h-[330px] overflow-hidden rounded-xl border border-white/8 bg-zinc-950/60 p-5 sm:min-h-[380px]" aria-label="Scattered productivity tools">
      <div className="absolute inset-x-10 top-1/2 border-t border-dashed border-white/[0.07]" aria-hidden="true" />
      <div className="absolute left-1/2 top-10 h-[78%] border-l border-dashed border-white/[0.07]" aria-hidden="true" />
      <div className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-white/10 bg-zinc-900 text-center text-[10px] font-medium leading-4 text-zinc-500 shadow-[0_12px_35px_rgba(0,0,0,0.3)]">
        Too many<br />places
      </div>
      {scatteredTools.map((tool) => <ToolCard key={tool.name} {...tool} />)}
    </div>
  );
}

function AtlasWorkspace() {
  const sections = ["Today", "Courses", "Projects", "Resources"];

  return (
    <div className="min-h-[330px] overflow-hidden rounded-xl border border-yellow-500/20 bg-zinc-900 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:min-h-[380px]">
      <div className="flex items-center gap-1.5 border-b border-white/8 px-3 py-2.5" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-zinc-600" />
        <span className="size-1.5 rounded-full bg-zinc-600" />
        <span className="size-1.5 rounded-full bg-zinc-600" />
        <span className="ml-2 text-[10px] font-medium tracking-[0.14em] text-zinc-500">ATLAS</span>
      </div>
      <div className="grid min-h-[280px] grid-cols-[92px_1fr] sm:min-h-[330px] sm:grid-cols-[112px_1fr]">
        <aside className="border-r border-white/8 p-3 sm:p-4">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-yellow-500">WORKSPACE</span>
          <nav aria-label="Atlas workspace sections" className="mt-4 space-y-1">
            {sections.map((section, index) => (
              <span key={section} className={`block rounded-md px-2 py-1.5 text-[10px] sm:text-xs ${index === 0 ? "bg-yellow-500/10 text-yellow-400" : "text-zinc-500"}`}>{section}</span>
            ))}
          </nav>
        </aside>
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-medium text-zinc-500">MONDAY, SEPTEMBER 9</p><h3 className="mt-1 text-base font-semibold tracking-tight text-white sm:text-lg">Everything, in context.</h3></div>
            <span className="rounded-md bg-yellow-500 px-2 py-1 text-[10px] font-semibold text-zinc-950">New</span>
          </div>
          <div className="mt-6 grid gap-3">
            <article className="rounded-lg border border-white/8 bg-zinc-950/70 p-3"><span className="text-[10px] font-medium text-yellow-500">UP NEXT</span><p className="mt-2 text-xs font-medium text-zinc-200">Review research notes</p><div className="mt-3 h-1.5 w-3/4 rounded-full bg-zinc-800"><div className="h-full w-1/2 rounded-full bg-yellow-500" /></div></article>
            <div className="grid grid-cols-2 gap-3"><article className="rounded-lg border border-white/8 bg-zinc-950/70 p-3"><span className="text-[10px] text-zinc-500">COURSEWORK</span><p className="mt-2 text-xs text-zinc-300">3 items due</p></article><article className="rounded-lg border border-white/8 bg-zinc-950/70 p-3"><span className="text-[10px] text-zinc-500">SAVED</span><p className="mt-2 text-xs text-zinc-300">12 resources</p></article></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProblemSection() {
  return (
    <section id="the-problem" aria-labelledby="problem-heading" className="border-t border-white/8 bg-zinc-950 px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.18em] text-yellow-500">THE PROBLEM</p>
          <h2 id="problem-heading" className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Your work is everywhere. Your focus is not.</h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-zinc-400">Notes, readings, deadlines, and ideas live across disconnected tools. Every switch costs attention—and makes it harder to see what actually matters.</p>
        </div>

        <div className="mt-12 grid items-center gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-7">
          <div><div className="mb-4 flex items-center justify-between"><p className="text-sm font-medium text-zinc-300">Scattered work</p><span className="text-xs text-zinc-600">Before</span></div><ScatteredTools /></div>
          <div className="flex h-10 items-center justify-center text-yellow-500 lg:h-auto lg:w-8" aria-hidden="true"><span className="text-xl lg:hidden">↓</span><span className="hidden text-xl lg:inline">→</span></div>
          <div><div className="mb-4 flex items-center justify-between"><p className="text-sm font-medium text-zinc-300">One clear workspace</p><span className="text-xs text-yellow-500">After</span></div><AtlasWorkspace /></div>
        </div>

        <aside className="mt-7 flex flex-col gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Atlas solution">
          <p className="text-sm leading-6 text-zinc-300"><span className="font-semibold text-yellow-400">Atlas brings the pieces together.</span> A single calm place for the work you are already doing.</p>
          <span className="shrink-0 text-xs font-medium tracking-[0.14em] text-yellow-500">ONE WORKSPACE</span>
        </aside>
      </div>
    </section>
  );
}

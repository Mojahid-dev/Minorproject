type OutcomeCardData = {
  number: string;
  title: string;
  description: string;
  position: string;
  delay: string;
};

const outcomes: OutcomeCardData[] = [
  { number: "01", title: "Everything organized", description: "Your work has one natural home.", position: "left-0 top-10", delay: "[animation-delay:-2.5s]" },
  { number: "02", title: "Less switching", description: "Stay with the task in front of you.", position: "right-0 top-28", delay: "[animation-delay:-5s]" },
  { number: "03", title: "Clearer focus", description: "See what matters next, at a glance.", position: "bottom-3 left-[12%]", delay: "[animation-delay:-3.5s]" },
];

function OutcomeCard({ number, title, description, position, delay }: OutcomeCardData) {
  return (
    <article className={`${position} ${delay} motion-safe:animate-atlas-drift z-10 rounded-lg border border-white/10 bg-zinc-900/95 p-3 shadow-[0_14px_35px_rgba(0,0,0,0.32)] backdrop-blur sm:absolute sm:w-44`}>
      <span className="text-[10px] font-semibold tracking-[0.14em] text-yellow-500">{number}</span>
      <h3 className="mt-1 text-xs font-semibold text-zinc-100">{title}</h3>
      <p className="mt-1 text-[11px] leading-4 text-zinc-500">{description}</p>
    </article>
  );
}

function AtlasDashboard() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-yellow-500/20 bg-zinc-900 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
      <div className="flex items-center gap-1.5 border-b border-white/8 px-3 py-2.5" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-zinc-600" />
        <span className="size-1.5 rounded-full bg-zinc-600" />
        <span className="size-1.5 rounded-full bg-zinc-600" />
        <span className="ml-2 text-[10px] font-semibold tracking-[0.14em] text-yellow-500">ATLAS</span>
      </div>
      <div className="grid min-h-[330px] grid-cols-[86px_1fr] sm:min-h-[390px] sm:grid-cols-[108px_1fr]">
        <aside className="border-r border-white/8 p-3 sm:p-4">
          <p className="text-[9px] font-semibold tracking-[0.14em] text-zinc-600">SPACES</p>
          <div className="mt-4 space-y-1" aria-label="Workspace navigation">
            {["Today", "Courses", "Projects", "Library"].map((item, index) => <span key={item} className={`block rounded-md px-2 py-1.5 text-[10px] sm:text-xs ${index === 0 ? "bg-yellow-500/10 text-yellow-400" : "text-zinc-500"}`}>{item}</span>)}
          </div>
          <div className="mt-7 border-t border-white/8 pt-3"><span className="block text-[9px] text-zinc-600">PERSONAL</span><span className="mt-2 block text-[10px] text-zinc-500">Reading list</span></div>
        </aside>
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-medium tracking-[0.08em] text-zinc-500">YOUR WORKSPACE</p><h3 className="mt-1 text-base font-semibold tracking-tight text-white sm:text-lg">Good afternoon, Alex.</h3></div><span className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-400">Sep 09</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-[1.18fr_.82fr]">
            <article className="rounded-lg border border-white/8 bg-zinc-950/65 p-3 sm:p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-yellow-500">FOCUS</span><span className="text-[10px] text-zinc-600">2 of 4</span></div><p className="mt-3 text-xs font-medium text-zinc-200">Finish biology revision notes</p><div className="mt-4 h-1.5 rounded-full bg-zinc-800"><div className="h-full w-2/3 rounded-full bg-yellow-500" /></div><p className="mt-2 text-[10px] text-zinc-500">Linked to: Cell Biology</p></article>
            <article className="rounded-lg border border-white/8 bg-zinc-950/65 p-3 sm:p-4"><span className="text-[10px] font-semibold text-zinc-500">UP NEXT</span><p className="mt-3 text-xs font-medium text-zinc-200">Research seminar</p><p className="mt-1 text-[10px] text-zinc-500">Tomorrow · 10:30</p></article>
          </div>
          <article className="mt-3 rounded-lg border border-white/8 bg-zinc-950/65 p-3 sm:p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-zinc-500">RECENTLY CONNECTED</span><span className="text-[10px] text-yellow-500">View all</span></div><div className="mt-3 grid grid-cols-3 gap-2"><span className="rounded bg-zinc-900 px-2 py-2 text-[10px] text-zinc-400">Notes</span><span className="rounded bg-zinc-900 px-2 py-2 text-[10px] text-zinc-400">Sources</span><span className="rounded bg-zinc-900 px-2 py-2 text-[10px] text-zinc-400">Tasks</span></div></article>
        </div>
      </div>
    </div>
  );
}

export default function SolutionSection() {
  return (
    <section id="solution" aria-labelledby="solution-heading" className="bg-zinc-950 px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.82fr_1.18fr] lg:gap-16">
        <div className="max-w-xl">
          <span className="inline-flex items-center rounded-full border border-yellow-500/25 bg-yellow-500/[0.07] px-3 py-1.5 text-xs font-medium tracking-[0.14em] text-yellow-400">ATLAS WORKSPACE</span>
          <h2 id="solution-heading" className="mt-5 text-balance text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">Stop managing apps. Start managing your work.</h2>
          <p className="mt-5 text-pretty text-base leading-7 text-zinc-400">Atlas brings your notes, projects, files, tasks, and study resources into one organized workspace—so you can spend less time searching and more time moving forward.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {["One place for the work you already do", "Find the right context without the hunt", "Keep your attention on what is next"].map((benefit) => <p key={benefit} className="flex items-center gap-3 text-sm text-zinc-300"><span className="grid size-5 shrink-0 place-items-center rounded-full border border-yellow-500/30 text-[10px] text-yellow-400">✓</span>{benefit}</p>)}
          </div>
          <a href="/sign-up" className="mt-9 inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:scale-[1.02] hover:bg-yellow-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400">Explore Atlas <span aria-hidden="true">→</span></a>
        </div>

        <div className="relative mx-auto w-full max-w-2xl pt-3 sm:pt-6">
          <div className="absolute inset-x-[15%] top-0 h-px bg-yellow-500/40" aria-hidden="true" />
          <div className="relative px-0 sm:px-8"><AtlasDashboard /></div>
          <div className="mt-4 grid gap-3 sm:contents">
            {outcomes.map((outcome) => <OutcomeCard key={outcome.number} {...outcome} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

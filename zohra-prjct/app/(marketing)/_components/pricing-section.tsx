type Plan = {
  name: string;
  audience: string;
  price: string;
  cadence: string;
  benefits: string[];
  cta: string;
  recommended?: boolean;
};

const plans: Plan[] = [
  { name: "Free", audience: "For individuals getting started.", price: "$X", cadence: "/ month", benefits: ["A personal Atlas workspace", "Notes, tasks, and resources", "A clear view of your week"], cta: "Start with Free" },
  { name: "Pro", audience: "For people who want more room to focus.", price: "$X", cadence: "/ month", benefits: ["Everything in Free", "Advanced organization", "Expanded workspace capacity", "Priority support"], cta: "Choose Pro", recommended: true },
  { name: "Team", audience: "For shared workspaces and teams.", price: "Coming soon", cadence: "", benefits: ["Everything in Pro", "Shared spaces and projects", "Team-level controls", "Designed for collaboration"], cta: "Join the waitlist" },
];

const comparisonRows = [
  ["Best for", "Starting out", "Focused individual work", "Shared work"],
  ["Personal workspace", "Included", "Included", "Included"],
  ["Connected resources", "Included", "Included", "Included"],
  ["Advanced organization", "—", "Included", "Included"],
  ["Shared workspaces", "—", "—", "Included"],
];

const faqs = [
  { question: "Can I start with the free plan?", answer: "Yes. The free plan is designed to let you build a personal Atlas workspace and decide whether it fits the way you work." },
  { question: "Will I be able to change plans later?", answer: "Yes. Plans are designed to grow with your workflow, so you can change when your needs change." },
  { question: "When will Team be available?", answer: "Team is currently being shaped around shared workspaces. You can join the waitlist to hear when it is ready." },
];

function PlanCard({ plan }: { plan: Plan }) {
  return <article className={`relative flex min-h-[440px] flex-col rounded-xl border p-6 transition duration-300 hover:-translate-y-1 sm:p-7 ${plan.recommended ? "border-yellow-500/35 bg-zinc-900 shadow-[0_20px_55px_rgba(0,0,0,0.3)]" : "border-white/10 bg-zinc-900/55 hover:border-white/20 hover:bg-zinc-900"}`}>{plan.recommended && <span className="absolute -top-3 left-6 rounded-full border border-yellow-500/30 bg-zinc-950 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-yellow-400">RECOMMENDED</span>}<div><h3 className="text-xl font-semibold tracking-tight text-white">{plan.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-zinc-500">{plan.audience}</p></div><div className="mt-7 border-y border-white/8 py-5"><span className={`text-3xl font-semibold tracking-[-0.04em] ${plan.price === "Coming soon" ? "text-zinc-200" : "text-yellow-400"}`}>{plan.price}</span>{plan.cadence && <span className="ml-1 text-sm text-zinc-500">{plan.cadence}</span>}</div><ul className="mt-6 space-y-3" aria-label={`${plan.name} benefits`}>{plan.benefits.map((benefit) => <li key={benefit} className="flex gap-3 text-sm text-zinc-300"><span className="grid size-5 shrink-0 place-items-center rounded-full border border-yellow-500/30 text-[10px] text-yellow-400">✓</span>{benefit}</li>)}</ul><a href="/sign-up" className={`mt-auto inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400 ${plan.recommended ? "bg-yellow-500 text-zinc-950 hover:bg-yellow-400" : "border border-white/12 bg-white/[0.03] text-zinc-200 hover:border-yellow-500/35 hover:text-yellow-400"}`}>{plan.cta}<span className="ml-2" aria-hidden="true">→</span></a></article>;
}

function Comparison() {
  return <div className="mt-14 overflow-x-auto rounded-xl border border-white/10"><div className="min-w-[620px] divide-y divide-white/8 bg-zinc-900/45">{comparisonRows.map((row, index) => <div key={row[0]} className="grid grid-cols-[1.45fr_repeat(3,1fr)]"><span className={`px-5 py-3 text-sm ${index === 0 ? "font-medium text-zinc-200" : "text-zinc-500"}`}>{row[0]}</span>{row.slice(1).map((value, valueIndex) => <span key={`${row[0]}-${valueIndex}`} className={`border-l border-white/8 px-4 py-3 text-center text-xs ${value === "Included" ? "text-yellow-400" : value === "—" ? "text-zinc-700" : "text-zinc-400"}`}>{value}</span>)}</div>)}</div></div>;
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return <details className="group border-t border-white/8"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-sm font-medium text-zinc-200 marker:content-none"><span>{question}</span><span className="grid size-6 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-500 transition group-open:rotate-45 group-open:border-yellow-500/30 group-open:text-yellow-400">+</span></summary><p className="max-w-2xl pb-5 text-sm leading-6 text-zinc-500">{answer}</p></details>;
}

export default function PricingSection() {
  return <section id="pricing" aria-labelledby="pricing-heading" className="border-t border-white/8 bg-zinc-950 px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto max-w-7xl"><header className="mx-auto max-w-2xl text-center"><span className="inline-flex rounded-full border border-yellow-500/25 bg-yellow-500/[0.07] px-3 py-1.5 text-xs font-medium tracking-[0.14em] text-yellow-400">PRICING</span><h2 id="pricing-heading" className="mt-5 text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-5xl">Simple plans. Room to grow.</h2><p className="mt-5 text-pretty text-base leading-7 text-zinc-400">Start with the space you need today. Move when your work asks for more—no pressure, no complicated choices.</p></header><div className="mt-14 grid gap-5 lg:grid-cols-3 lg:items-stretch">{plans.map((plan) => <PlanCard key={plan.name} plan={plan} />)}</div><div className="mx-auto mt-16 max-w-4xl"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-medium tracking-[0.16em] text-yellow-500">AT A GLANCE</p><h3 className="mt-2 text-xl font-semibold tracking-tight text-white">A clear fit, at every stage.</h3></div><span className="hidden text-xs text-zinc-600 sm:block">Plan details are placeholders</span></div><Comparison /></div><div className="mx-auto mt-16 max-w-3xl"><p className="text-xs font-medium tracking-[0.16em] text-yellow-500">PRICING QUESTIONS</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">A few useful details.</h3><div className="mt-6 border-b border-white/8">{faqs.map((faq) => <FaqItem key={faq.question} {...faq} />)}</div></div></div></section>;
}

"use client";

import { useId, useState } from "react";

type Faq = { id: string; question: string; answer: string };

const faqs: Faq[] = [
  { id: "what-is-atlas", question: "What is Atlas?", answer: "Atlas is a connected workspace for organizing notes, projects, resources, tasks, and time in one calmer place." },
  { id: "who-is-atlas-for", question: "Who is Atlas designed for?", answer: "Atlas is made for students and knowledge workers who want their work to feel organized without managing a collection of disconnected tools." },
  { id: "free-to-use", question: "Is Atlas free to use?", answer: "A free plan is available for getting started. Plan details and pricing are shown above and can be updated as Atlas evolves." },
  { id: "multiple-devices", question: "Can I access Atlas from multiple devices?", answer: "Atlas is designed to be available wherever you return to your work, so your workspace can follow your day." },
  { id: "data-security", question: "Is my data secure?", answer: "Protecting your workspace is a core responsibility. Atlas is designed with thoughtful data handling and long-term reliability in mind." },
  { id: "export-data", question: "Can I export my data?", answer: "Yes. Your work should remain yours, and Atlas is designed to make your information portable when you need it." },
  { id: "offline", question: "Will Atlas work offline?", answer: "Offline support depends on the part of Atlas you are using. Clear availability details will be provided as the product develops." },
  { id: "updates", question: "How often is Atlas updated?", answer: "Atlas is improved continuously with a focus on useful refinements, reliability, and a product experience that stays calm as it grows." },
  { id: "install", question: "Do I need to install anything?", answer: "No additional installation is needed to get started. Atlas is designed to make entering your workspace as simple as possible." },
  { id: "support", question: "How can I contact support?", answer: "You can reach out through the support contact below. We will be glad to help with questions about Atlas or your workspace." },
];

function FaqRow({ faq, index, expanded, onToggle, panelId }: { faq: Faq; index: number; expanded: boolean; onToggle: () => void; panelId: string }) {
  return <article className="border-t border-white/8"><h3><button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={onToggle} className="group flex w-full items-center gap-4 py-5 text-left outline-none sm:gap-6 sm:py-6 focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"><span className="w-6 shrink-0 text-[10px] font-semibold tracking-[0.12em] text-yellow-500">{String(index + 1).padStart(2, "0")}</span><span className="flex-1 text-sm font-medium text-zinc-200 sm:text-base">{faq.question}</span><span className={`grid size-7 shrink-0 place-items-center rounded-full border text-lg font-light transition duration-300 ${expanded ? "rotate-45 border-yellow-500/35 bg-yellow-500/10 text-yellow-400" : "border-white/10 text-zinc-500 group-hover:border-yellow-500/25 group-hover:text-yellow-400"}`}>+</span></button></h3><div id={panelId} role="region" aria-label={faq.question} className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}><div className="min-h-0"><p className="max-w-2xl pb-6 pl-10 pr-12 text-sm leading-6 text-zinc-500 sm:pl-12 sm:text-[15px]">{faq.answer}</p></div></div></article>;
}

export default function FaqSection() {
  const [openId, setOpenId] = useState<string | null>("what-is-atlas");
  const idPrefix = useId();
  return <section id="faq" aria-labelledby="faq-heading" className="border-t border-white/8 bg-zinc-950 px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto max-w-3xl"><header className="text-center"><span className="inline-flex rounded-full border border-yellow-500/25 bg-yellow-500/[0.07] px-3 py-1.5 text-xs font-medium tracking-[0.14em] text-yellow-400">FAQ</span><h2 id="faq-heading" className="mt-5 text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-5xl">A few useful answers.</h2><p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-zinc-400">The details people usually want before making Atlas part of their day.</p></header><div className="mt-12 border-b border-white/8">{faqs.map((faq, index) => <FaqRow key={faq.id} faq={faq} index={index} expanded={openId === faq.id} onToggle={() => setOpenId((current) => current === faq.id ? null : faq.id)} panelId={`${idPrefix}-${faq.id}`} />)}</div><aside className="mt-12 rounded-xl border border-white/10 bg-zinc-900/55 px-5 py-5 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-6"><div><p className="text-sm font-semibold text-zinc-200">Still have a question?</p><p className="mt-1 text-sm leading-6 text-zinc-500">We are happy to help you find the right answer.</p></div><a href="mailto:support@atlas.app" className="mt-4 inline-flex shrink-0 items-center gap-2 text-sm font-medium text-yellow-400 transition hover:text-yellow-300 sm:mt-0">Contact us <span aria-hidden="true">→</span></a></aside></div></section>;
}

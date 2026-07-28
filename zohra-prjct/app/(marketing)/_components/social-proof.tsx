import { Quote, Star } from "lucide-react";

// Replace this placeholder content with customer names, logos, and proof points.
const socialProofContent = {
  eyebrow: "TRUSTED BY TEAMS LIKE YOURS",
  title: "Built to make meaningful work feel simpler.",
  logos: ["YOUR LOGO", "YOUR LOGO", "YOUR LOGO", "YOUR LOGO"],
  testimonial: {
    quote:
      "Add a concise customer quote here that explains the result your product created for them.",
    name: "Customer name",
    role: "Role, Company",
    initials: "CN",
  },
  stats: [
    { value: "00K+", label: "placeholder users" },
    { value: "00%", label: "placeholder satisfaction" },
    { value: "00 hrs", label: "placeholder saved" },
  ],
};

export default function SocialProofSection() {
  return (
    <section className="border-y border-white/8 bg-zinc-950 px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-xs font-medium tracking-[0.18em] text-yellow-500">
            {socialProofContent.eyebrow}
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {socialProofContent.title}
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 sm:grid-cols-4">
          {socialProofContent.logos.map((logo, index) => (
            <div
              key={`${logo}-${index}`}
              className="grid min-h-24 place-items-center border-b border-white/10 text-xs font-semibold tracking-[0.16em] text-zinc-500 last:border-b-0 even:border-l even:border-white/10 sm:border-b-0 sm:not-first:border-l"
            >
              {logo}
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <figure className="relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-zinc-900 to-zinc-950 p-7 sm:p-9">
            <Quote className="absolute right-7 top-7 size-12 text-yellow-500/15 sm:right-9 sm:top-9" aria-hidden="true" />
            <div className="flex gap-1 text-yellow-400" aria-label="Five star rating">
              {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill="currentColor" />)}
            </div>
            <blockquote className="relative mt-6 max-w-xl text-pretty text-xl font-medium leading-8 text-zinc-100 sm:text-2xl sm:leading-9">
              “{socialProofContent.testimonial.quote}”
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-yellow-500 text-xs font-bold text-zinc-950">
                {socialProofContent.testimonial.initials}
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{socialProofContent.testimonial.name}</span>
                <span className="mt-0.5 block text-sm text-zinc-500">{socialProofContent.testimonial.role}</span>
              </span>
            </figcaption>
          </figure>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {socialProofContent.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <span className="text-3xl font-semibold tracking-[-0.04em] text-yellow-400">{stat.value}</span>
                <span className="mt-1 text-sm text-zinc-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

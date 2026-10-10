import Link from "next/link";
import { ArrowUpRight, Globe, Mail, MessageCircle, Send, Sparkles } from "lucide-react";

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "#changelog" },
      { label: "Roadmap", href: "#roadmap" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#documentation" },
      { label: "Blog", href: "#blog" },
      { label: "Help Center", href: "#help" },
      { label: "Community", href: "#community" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "#careers" },
      { label: "Contact", href: "mailto:hello@atlas.app" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#privacy" },
      { label: "Terms of Service", href: "#terms" },
      { label: "Cookie Policy", href: "#cookies" },
    ],
  },
];

const socialLinks = [
  { label: "Community", href: "https://twitter.com", icon: MessageCircle },
  { label: "Website", href: "https://github.com", icon: Globe },
  { label: "Updates", href: "https://linkedin.com", icon: Send },
  { label: "Email", href: "mailto:hello@atlas.app", icon: Mail },
];

export default function Footer() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-white/10 bg-zinc-950 px-5 py-16 text-zinc-300 sm:px-8 lg:px-12 lg:py-24">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_40%_0%,rgba(202,138,4,0.12),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(250,204,21,0.08),transparent_24%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.11] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,transparent,black_38%,transparent)]" />

      <div className="mx-auto flex max-w-7xl flex-col gap-12">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10 text-yellow-400">
                <Sparkles size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-[-0.02em] text-white">Atlas</p>
                <p className="text-sm text-zinc-500">Elegant workspace for focused teams</p>
              </div>
            </div>

            <p className="mt-6 text-base leading-7 text-zinc-400">
              Atlas helps people organize their work in one beautiful workspace, turning scattered ideas into calm, meaningful momentum.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              {socialLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                    aria-label={item.label}
                    className="group inline-flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-yellow-500/30 hover:bg-yellow-500/10 hover:text-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60"
                  >
                    <Icon size={16} aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>

          <nav aria-label="Footer navigation" className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-200">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:text-white"
                      >
                        <span className="relative after:absolute after:bottom-[-2px] after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-yellow-400 after:transition-transform after:duration-200 group-hover:after:scale-x-100">
                          {link.label}
                        </span>
                        <ArrowUpRight size={14} className="opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p>© 2026 Atlas. All rights reserved.</p>
            <span className="hidden h-1 w-1 rounded-full bg-zinc-700 sm:block" aria-hidden="true" />
            <p>Version 1.0</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p>Made with care for people who value focus.</p>
            <span className="hidden h-1 w-1 rounded-full bg-zinc-700 sm:block" aria-hidden="true" />
            <p className="text-zinc-400">Built to feel calm, clear, and complete.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

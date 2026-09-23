"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ModeToggle } from "../../../components/ui/darkToggle";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 12);

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="fixed inset-x-0 top-3 z-30 flex justify-center px-3 sm:top-5 sm:px-6">
      <nav
        className={`relative w-full max-w-6xl overflow-hidden border px-4 transition-all duration-300 sm:px-5 ${
          scrolled
            ? "rounded-2xl border-white/15 bg-zinc-950/85 py-2 shadow-[0_16px_50px_rgba(0,0,0,0.48)] backdrop-blur-xl"
            : "rounded-3xl border-white/20 bg-zinc-900/70 py-3 shadow-[0_12px_65px_rgba(0,0,0,0.38)] backdrop-blur-xl"
        }`}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300/70 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 left-1/2 size-32 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5" onClick={closeMenu}>
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-yellow-400/20 bg-black p-1 shadow-[0_0_18px_rgba(234,179,8,0.12)] transition group-hover:border-yellow-400/45">
              <Image src="/Logo.svg" alt="Zohra logo" width={35} height={35} priority className="size-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-yellow-400">Zohra</h1>
              <p className="text-[11px] font-medium tracking-wide text-zinc-400">AI WORKSPACE</p>
            </div>
          </Link>
          <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center rounded-full border border-white/10 bg-black/20 p-1 lg:flex">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition-all duration-200 hover:bg-white/[0.07] hover:text-yellow-300">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-300 transition-all hover:bg-white/5 hover:text-white">Sign In</Link>
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_8px_25px_rgba(234,179,8,0.22)] transition-all hover:-translate-y-0.5 hover:bg-yellow-300">Get Started <ArrowRight size={16} /></Link>
            <ModeToggle />
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <ModeToggle />
            <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} className="grid size-10 place-items-center rounded-xl border border-white/10 text-zinc-200 transition hover:border-yellow-500/40 hover:bg-white/5 hover:text-yellow-400">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <div id="mobile-navigation" className={`grid transition-[grid-template-rows,opacity] duration-300 lg:hidden ${menuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="min-h-0 overflow-hidden">
              <div className="mt-3 border-t border-white/10 pt-3">
                <ul className="space-y-1">
                {navigation.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} onClick={closeMenu} className="block rounded-xl px-3 py-3 text-sm font-medium text-zinc-300 transition hover:bg-yellow-400/10 hover:text-yellow-300">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link href="/login" onClick={closeMenu} className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/5">Sign In</Link>
                <Link href="/sign-up" onClick={closeMenu} className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-300">Get Started <ArrowRight size={16} /></Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

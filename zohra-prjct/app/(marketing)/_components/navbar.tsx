"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { ModeToggle } from "../../../components/ui/darkToggle";

const navigation = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="fixed inset-x-0 top-3 z-30 flex justify-center px-3 sm:top-5 sm:px-6">
      <nav className="relative w-full max-w-7xl rounded-2xl border border-white/20 bg-zinc-900/90 px-4 py-3 shadow-[0_10px_60px_rgba(0,0,0,0.45)] backdrop-blur-4xl sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" onClick={closeMenu}>
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-black p-1">
              <Image src="/Logo.svg" alt="Zohra logo" width={35} height={35} priority className="size-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-yellow-500">Zohra</h1>
              <p className="text-xs text-zinc-400">AI Workspace</p>
            </div>
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-zinc-400 transition-colors duration-200 hover:text-yellow-500">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/5 hover:text-white">Sign In</Link>
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:scale-[1.03] hover:bg-zinc-200">Get Started <ArrowRight size={16} /></Link>
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
                    <Link href={item.href} onClick={closeMenu} className="block rounded-xl px-3 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-yellow-400">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link href="/login" onClick={closeMenu} className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/5">Sign In</Link>
                <Link href="/sign-up" onClick={closeMenu} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">Get Started <ArrowRight size={16} /></Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

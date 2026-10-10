"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Home, Menu, Search, Settings2, Upload, UserRound, X, ListTodo, LogOut } from "lucide-react";
import { signOutAndClearCookies, useSession } from "@/lib/auth-client";

const navigation = [
  { label: "Overview", href: "/dashboard", icon: Home },
  { label: "Resources", href: "/resources", icon: FileText },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Upload", href: "/upload", icon: Upload },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const profileName = session?.user?.name || "Your profile";
  const profileImage = session?.user?.image || "";
  const initials = profileName.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";

  async function handleSignOut() {
    try { await signOutAndClearCookies(); } finally { router.push("/"); }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/resources?q=${encodeURIComponent(query)}` : "/resources");
  }

  return (
    <main className="h-screen overflow-hidden bg-zinc-950 text-neutral-100">
      <div className="flex h-full max-w-full overflow-hidden border border-zinc-800 bg-zinc-950">
        <aside className={`${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 flex w-[280px] shrink-0 flex-col border-r border-zinc-800 bg-black px-4 py-5 shadow-xl transition-transform md:static md:translate-x-0 md:shadow-none`}>
          <div className="flex items-center justify-between px-2">
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="grid size-10 place-items-center overflow-hidden rounded-lg bg-black p-1"><Image src="/Logo.svg" alt="Zohra" width={30} height={30} priority className="h-full w-full object-contain" /></span>
              <span className="text-[22px] font-bold tracking-[-0.06em] text-white">Zohra</span>
            </Link>
            <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-white/10 hover:text-white md:hidden"><X size={18} /></button>
          </div>
          <p className="mt-9 px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">Workspace</p>
          <nav className="space-y-1.5" aria-label="Main navigation">
            {navigation.map(({ label, href, icon: Icon }) => {
              const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
              return <Link key={label} href={href} onClick={() => setMobileMenuOpen(false)} aria-current={isActive ? "page" : undefined} className={`${isActive ? "border border-white/15 bg-white/[0.09] text-white" : "text-neutral-400 hover:bg-white/[0.05] hover:text-white"} flex h-11 items-center rounded-xl px-3 text-sm font-medium transition`}>
                <Icon size={19} /><span className="ml-3">{label}</span>
              </Link>;
            })}
          </nav>
          <div className="mt-auto space-y-1.5 border-t border-zinc-800 pt-4">
            <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex h-10 items-center rounded-xl px-3 text-sm text-neutral-400 hover:bg-white/10 hover:text-white"><UserRound size={18} /><span className="ml-3">Profile</span></Link>
            <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="flex h-10 items-center rounded-xl px-3 text-sm text-neutral-400 hover:bg-white/10 hover:text-white"><Settings2 size={18} /><span className="ml-3">Settings</span></Link>
            <button onClick={handleSignOut} className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-neutral-500 hover:bg-white/10 hover:text-white"><LogOut size={18} /><span className="ml-3">Sign out</span></button>
          </div>
        </aside>
        {mobileMenuOpen && <button type="button" aria-label="Close menu overlay" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-black/60 md:hidden" />}
        <section className="min-w-0 flex-1 overflow-y-auto bg-zinc-950">
          <header className="sticky top-0 z-10 flex h-[76px] items-center border-b border-zinc-800 bg-zinc-950 px-4 sm:px-8">
            <button onClick={() => setMobileMenuOpen(true)} className="mr-3 grid size-10 shrink-0 place-items-center rounded-xl text-neutral-300 hover:bg-white/10 md:hidden" aria-label="Open menu"><Menu size={22} /></button>
            <form onSubmit={submitSearch} className="relative min-w-0 max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
              <input aria-label="Search resources by file name" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources..." className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-neutral-500" />
            </form>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <Link href="/upload" className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 sm:px-3.5"><Upload size={16} /><span className="hidden sm:inline">Upload resource</span><span className="sm:hidden">Upload</span></Link>
              <div className="mx-1 hidden h-8 w-px bg-white/10 sm:block" />
              <Link href="/profile" aria-label={`Open ${profileName} profile`} title={profileName} className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-zinc-200 text-xs font-bold text-zinc-900">
                {profileImage ? <Image src={profileImage} alt="" width={36} height={36} unoptimized className="size-full object-cover" /> : initials}
              </Link>
            </div>
          </header>
          <div className="p-5 sm:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

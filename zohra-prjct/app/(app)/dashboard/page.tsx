"use client";

import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  FolderKanban,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings2,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signOutAndClearCookies } from "@/lib/auth-client";

const navigation = [
  { label: "Overview", icon: Home },
  { label: "Projects", icon: FolderKanban, badge: "8" },
  { label: "My tasks", icon: LayoutGrid, badge: "12" },
  { label: "Calendar", icon: CalendarDays },
  { label: "Team", icon: UsersRound },
];

const workspace = [
  { label: "Design system", color: "bg-black" },
  { label: "Website refresh", color: "bg-neutral-500" },
  { label: "Marketing", color: "bg-neutral-300" },
];

function ZohraMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center overflow-hidden rounded-lg bg-black p-1 shadow-[0_6px_16px_rgba(0,0,0,0.2)]">
        <Image src="/Logo.svg" alt="Zohra logo" width={40} height={44} priority className="h-full w-full object-contain" />
      </div>
      {!compact && <span className="text-[22px] font-bold tracking-[-0.06em] text-black">Zohra</span>}
    </div>
  );
}

export default function DashboardPage() {
  const [active, setActive] = useState("Overview");
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOutAndClearCookies();
    } finally {
      router.push("/login");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-full overflow-hidden border border-neutral-200 bg-white shadow-[0_25px_80px_rgba(0,0,0,0.12)]">
        <aside className={`${collapsed ? "w-[86px]" : "w-[272px]"} hidden shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 px-4 py-5 transition-[width] duration-300 md:flex`}>
          <div className="flex items-center justify-between px-2">
            <ZohraMark compact={collapsed} />
            {!collapsed && (
              <button onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" className="grid size-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-200 hover:text-black">
                <ChevronLeft size={18} />
              </button>
            )}
          </div>

          {collapsed && (
            <button onClick={() => setCollapsed(false)} aria-label="Expand sidebar" className="mt-5 grid size-10 place-items-center self-center rounded-xl bg-neutral-200 text-black transition hover:bg-neutral-300">
              <ChevronRight size={18} />
            </button>
          )}

          <div className="mt-9">
            {!collapsed && <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Workspace</p>}
            <nav className="space-y-1.5">
              {navigation.map(({ label, icon: Icon, badge }) => {
                const isActive = active === label;
                return (
                  <button key={label} onClick={() => setActive(label)} title={collapsed ? label : undefined} className={`${isActive ? "bg-black text-white" : "text-neutral-500 hover:bg-neutral-200 hover:text-black"} flex h-11 w-full items-center rounded-xl px-3 text-sm font-medium transition`}>
                    <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                    {!collapsed && <span className="ml-3 flex-1 text-left">{label}</span>}
                    {!collapsed && badge && <span className={`${isActive ? "bg-white text-black" : "bg-neutral-200 text-neutral-600"} rounded-md px-1.5 py-0.5 text-[11px] font-semibold`}>{badge}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {!collapsed && (
            <div className="mt-8">
              <div className="flex items-center justify-between px-3 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Spaces</p>
                <button className="text-neutral-500 transition hover:text-black" aria-label="Add space"><Plus size={16} /></button>
              </div>
              <div className="space-y-1">
                {workspace.map(({ label, color }) => (
                  <button key={label} className="flex h-9 w-full items-center rounded-lg px-3 text-sm text-neutral-500 transition hover:bg-neutral-200 hover:text-black">
                    <span className={`mr-3 size-2 rounded-full ${color}`} />{label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto space-y-1.5">
            <button title={collapsed ? "Help centre" : undefined} className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-neutral-500 transition hover:bg-neutral-200 hover:text-black"><CircleHelp size={19} />{!collapsed && <span className="ml-3">Help centre</span>}</button>
            <button title={collapsed ? "Settings" : undefined} className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-neutral-500 transition hover:bg-neutral-200 hover:text-black"><Settings2 size={19} />{!collapsed && <span className="ml-3">Settings</span>}</button>
            <div className="my-3 h-px bg-neutral-200" />
            <div className={`${collapsed ? "justify-center" : ""} flex items-center px-2 py-1`}>
              <div className="grid size-9 place-items-center rounded-full bg-black text-xs font-bold text-white">ZA</div>
              {!collapsed && <div className="ml-2.5 min-w-0 flex-1"><p className="truncate text-sm font-semibold text-black">Zohra Admin</p><p className="truncate text-xs text-neutral-400">admin@zohra.app</p></div>}
              {!collapsed && <ChevronDown size={16} className="text-neutral-400" />}
            </div>
            <button onClick={handleSignOut} title={collapsed ? "Sign out" : undefined} className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-neutral-500 transition hover:bg-neutral-200 hover:text-black"><LogOut size={18} />{!collapsed && <span className="ml-3">Sign out</span>}</button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 bg-white">
          <header className="flex h-[76px] items-center border-b border-neutral-200 px-5 sm:px-8">
            <button className="mr-3 text-neutral-700 md:hidden" aria-label="Open menu"><Menu size={22} /></button>
            <div className="relative hidden w-full max-w-sm sm:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} /><input aria-label="Search" placeholder="Search anything..." className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-4 focus:ring-neutral-200" /></div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3"><button aria-label="Messages" className="grid size-10 place-items-center rounded-xl text-neutral-600 transition hover:bg-neutral-100 hover:text-black"><MessageCircle size={20} /></button><button aria-label="Notifications" className="relative grid size-10 place-items-center rounded-xl text-neutral-600 transition hover:bg-neutral-100 hover:text-black"><Bell size={20} /><span className="absolute right-2.5 top-2.5 size-2 rounded-full border-2 border-white bg-black" /></button><button className="hidden items-center gap-2 rounded-xl bg-black px-3.5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition hover:bg-neutral-800 sm:flex"><Plus size={17} />New project</button></div>
          </header>

          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-medium text-neutral-500">Thursday, July 31</p><h1 className="text-3xl font-bold tracking-[-0.045em] text-black">Good morning, Zohra <span aria-hidden="true">✦</span></h1><p className="mt-2 text-sm text-neutral-500">Here’s a focused view of what needs your attention today.</p></div><button className="flex items-center gap-2 rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 hover:text-black"><Compass size={17} />Explore workspace</button></div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div className="rounded-2xl border border-neutral-200 bg-white p-5"><Sparkles size={20} className="text-black" /><p className="mt-7 text-sm text-neutral-500">Your workspace is ready</p><p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-black">Navigation complete</p></div><div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5"><BookOpen size={20} className="text-neutral-700" /><p className="mt-7 text-sm text-neutral-500">Next up</p><p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-black">Build your dashboard</p></div></div>
          </div>
        </section>
      </div>
    </main>
  );
}

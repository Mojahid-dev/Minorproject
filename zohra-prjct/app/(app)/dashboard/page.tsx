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
import { signOutAndClearCookies } from "@/lib/auth-client";

const navigation = [
  { label: "Overview", icon: Home },
  { label: "Projects", icon: FolderKanban, badge: "8" },
  { label: "My tasks", icon: LayoutGrid, badge: "12" },
  { label: "Calendar", icon: CalendarDays },
  { label: "Team", icon: UsersRound },
];

const workspace = [
  { label: "Design system", color: "bg-violet-500" },
  { label: "Website refresh", color: "bg-amber-400" },
  { label: "Marketing", color: "bg-rose-400" },
];

function ZohraMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-10 place-items-center rounded-xl bg-[#245b4a] shadow-[0_8px_20px_rgba(36,91,74,0.24)]">
        <span className="absolute size-3.5 -translate-x-[5px] -translate-y-[4px] rounded-full bg-[#d8f3e7]" />
        <span className="absolute size-3.5 translate-x-[5px] -translate-y-[4px] rounded-full bg-[#b6e9d2]" />
        <span className="absolute size-3.5 -translate-x-[5px] translate-y-[4px] rounded-full bg-[#a4dfc4]" />
        <span className="absolute size-3.5 translate-x-[5px] translate-y-[4px] rounded-full bg-[#e3f7ee]" />
        <span className="relative size-2 rounded-full bg-[#245b4a]" />
      </div>
      {!compact && <span className="text-[22px] font-bold tracking-[-0.06em] text-[#193c32]">Zohra</span>}
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
    <main className="min-h-screen bg-[#f6f8f7] p-3 text-[#23443a] sm:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-[1540px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_25px_80px_rgba(34,63,52,0.10)] sm:min-h-[calc(100vh-40px)]">
        <aside className={`${collapsed ? "w-[86px]" : "w-[272px]"} hidden shrink-0 flex-col border-r border-[#e8eeeb] bg-[#fbfcfb] px-4 py-5 transition-[width] duration-300 md:flex`}>
          <div className="flex items-center justify-between px-2">
            <ZohraMark compact={collapsed} />
            {!collapsed && (
              <button onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" className="grid size-8 place-items-center rounded-lg text-[#789087] transition hover:bg-[#ecf4f0] hover:text-[#245b4a]">
                <ChevronLeft size={18} />
              </button>
            )}
          </div>

          {collapsed && (
            <button onClick={() => setCollapsed(false)} aria-label="Expand sidebar" className="mt-5 grid size-10 place-items-center self-center rounded-xl bg-[#edf5f1] text-[#245b4a] transition hover:bg-[#dceee7]">
              <ChevronRight size={18} />
            </button>
          )}

          <div className="mt-9">
            {!collapsed && <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9aaba4]">Workspace</p>}
            <nav className="space-y-1.5">
              {navigation.map(({ label, icon: Icon, badge }) => {
                const isActive = active === label;
                return (
                  <button key={label} onClick={() => setActive(label)} title={collapsed ? label : undefined} className={`${isActive ? "bg-[#e5f2ec] text-[#1e5b48]" : "text-[#72857e] hover:bg-[#f0f6f3] hover:text-[#285b4b]"} flex h-11 w-full items-center rounded-xl px-3 text-sm font-medium transition`}>
                    <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                    {!collapsed && <span className="ml-3 flex-1 text-left">{label}</span>}
                    {!collapsed && badge && <span className={`${isActive ? "bg-white text-[#2c725b]" : "bg-[#edf1ef] text-[#82938c]"} rounded-md px-1.5 py-0.5 text-[11px] font-semibold`}>{badge}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {!collapsed && (
            <div className="mt-8">
              <div className="flex items-center justify-between px-3 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9aaba4]">Spaces</p>
                <button className="text-[#8aa097] transition hover:text-[#285b4b]" aria-label="Add space"><Plus size={16} /></button>
              </div>
              <div className="space-y-1">
                {workspace.map(({ label, color }) => (
                  <button key={label} className="flex h-9 w-full items-center rounded-lg px-3 text-sm text-[#71837c] transition hover:bg-[#f0f6f3] hover:text-[#285b4b]">
                    <span className={`mr-3 size-2 rounded-full ${color}`} />{label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto space-y-1.5">
            <button title={collapsed ? "Help centre" : undefined} className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-[#74877f] transition hover:bg-[#f0f6f3] hover:text-[#285b4b]"><CircleHelp size={19} />{!collapsed && <span className="ml-3">Help centre</span>}</button>
            <button title={collapsed ? "Settings" : undefined} className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-[#74877f] transition hover:bg-[#f0f6f3] hover:text-[#285b4b]"><Settings2 size={19} />{!collapsed && <span className="ml-3">Settings</span>}</button>
            <div className="my-3 h-px bg-[#e8eeeb]" />
            <div className={`${collapsed ? "justify-center" : ""} flex items-center px-2 py-1`}>
              <div className="grid size-9 place-items-center rounded-full bg-[#e3d1bd] text-xs font-bold text-[#694932]">ZA</div>
              {!collapsed && <div className="ml-2.5 min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#315449]">Zohra Admin</p><p className="truncate text-xs text-[#93a29c]">admin@zohra.app</p></div>}
              {!collapsed && <ChevronDown size={16} className="text-[#90a199]" />}
            </div>
            <button onClick={handleSignOut} title={collapsed ? "Sign out" : undefined} className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-[#83958e] transition hover:bg-[#fff0ed] hover:text-[#c0523d]"><LogOut size={18} />{!collapsed && <span className="ml-3">Sign out</span>}</button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 bg-white">
          <header className="flex h-[76px] items-center border-b border-[#edf1ef] px-5 sm:px-8">
            <button className="mr-3 text-[#3c6256] md:hidden" aria-label="Open menu"><Menu size={22} /></button>
            <div className="relative hidden w-full max-w-sm sm:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a79f]" size={18} /><input aria-label="Search" placeholder="Search anything..." className="h-10 w-full rounded-xl border border-[#e7eeea] bg-[#fafcfb] pl-10 pr-4 text-sm outline-none transition placeholder:text-[#a7b5b0] focus:border-[#8cb9a8] focus:ring-4 focus:ring-[#e6f3ed]" /></div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3"><button aria-label="Messages" className="grid size-10 place-items-center rounded-xl text-[#607970] transition hover:bg-[#eff6f2] hover:text-[#245b4a]"><MessageCircle size={20} /></button><button aria-label="Notifications" className="relative grid size-10 place-items-center rounded-xl text-[#607970] transition hover:bg-[#eff6f2] hover:text-[#245b4a]"><Bell size={20} /><span className="absolute right-2.5 top-2.5 size-2 rounded-full border-2 border-white bg-[#e9785f]" /></button><button className="hidden items-center gap-2 rounded-xl bg-[#245b4a] px-3.5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(36,91,74,0.18)] transition hover:bg-[#1d4c3e] sm:flex"><Plus size={17} />New project</button></div>
          </header>

          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-medium text-[#789087]">Thursday, July 31</p><h1 className="text-3xl font-bold tracking-[-0.045em] text-[#1d4136]">Good morning, Zohra <span aria-hidden="true">✦</span></h1><p className="mt-2 text-sm text-[#7c9088]">Here’s a calm view of what needs your attention today.</p></div><button className="flex items-center gap-2 rounded-xl border border-[#dfe9e4] px-3.5 py-2.5 text-sm font-semibold text-[#416457] transition hover:bg-[#f0f6f3]"><Compass size={17} />Explore workspace</button></div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div className="rounded-2xl border border-[#e7eeea] bg-[#fbfdfc] p-5"><Sparkles size={20} className="text-[#38836a]" /><p className="mt-7 text-sm text-[#789087]">Your workspace is ready</p><p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#23443a]">Navigation complete</p></div><div className="rounded-2xl border border-dashed border-[#c8ddd3] bg-[#f7fbf9] p-5"><BookOpen size={20} className="text-[#5a8d7a]" /><p className="mt-7 text-sm text-[#789087]">Next up</p><p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#23443a]">Build your dashboard</p></div></div>
          </div>
        </section>
      </div>
    </main>
  );
}

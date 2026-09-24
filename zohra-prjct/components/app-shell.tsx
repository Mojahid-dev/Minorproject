"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  FolderKanban,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { signOutAndClearCookies, useSession } from "@/lib/auth-client";

const navigation = [
  { label: "Overview", href: "/dashboard", icon: Home },
  { label: "Resources", href: "/resources", icon: FolderKanban, badge: "3" },
  { label: "Tasks", href: "/dashboard", icon: LayoutGrid, badge: "12" },
  { label: "Calendar", href: "/dashboard", icon: CalendarDays },
  { label: "Team", href: "/dashboard", icon: UsersRound },
  { label: "Upload", href: "/upload", icon: Upload },
];

function ZohraMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center overflow-hidden rounded-lg bg-black p-1 shadow-[0_6px_16px_rgba(0,0,0,0.2)]">
        <Image
          src="/Logo.svg"
          alt="Zohra logo"
          width={30}
          height={30}
          priority
          className="h-full w-full object-contain"
        />
      </div>
      {!compact && (
        <span className="text-[22px] font-bold tracking-[-0.06em] text-white">
          Zohra
        </span>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const profileName = session?.user?.name || "Zohra Admin";
  const profileImage = session?.user?.image || "";
  const profileInitials =
    profileName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ZA";

  async function handleSignOut() {
    try {
      await signOutAndClearCookies();
    } finally {
      router.push("/");
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-zinc-950 text-neutral-100">
      <div className="flex h-full max-w-full overflow-hidden border border-zinc-800 bg-zinc-950 shadow-[0_25px_80px_rgba(0,0,0,0.4)]">
        <aside
          className={`${collapsed ? "md:w-[86px]" : "md:w-[272px]"} fixed inset-y-0 left-0 z-40 flex w-[280px] shrink-0 flex-col border-r border-zinc-800 bg-black px-4 py-5 shadow-xl transition-[transform,width] duration-300 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:static md:h-full md:translate-x-0 md:shadow-none`}
        >
          <div className="flex items-center justify-between px-2">
            <ZohraMark compact={collapsed} />
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="grid size-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-white/10 hover:text-white md:hidden"
            >
              <X size={18} />
            </button>
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                className="hidden size-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-white/10 hover:text-white md:grid"
              >
                <ChevronLeft size={18} />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="mt-5 hidden size-10 place-items-center self-center rounded-xl bg-zinc-800 text-white transition hover:bg-zinc-700 md:grid"
            >
              <ChevronRight size={18} />
            </button>
          )}
          <div className="mt-9">
            {!collapsed && (
              <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Workspace
              </p>
            )}
            <nav className="space-y-1.5">
              {navigation.map(({ label, href, icon: Icon, badge }) => {
                const isActive =
                  href === "/dashboard"
                    ? pathname === "/dashboard" && label === "Overview"
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    title={collapsed ? label : undefined}
                    className={`${isActive ? "relative isolate overflow-hidden border border-white/15 bg-white/[0.09] text-white shadow-[0_8px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-r-full before:bg-white before:shadow-[0_0_14px_rgba(255,255,255,0.9)]" : "text-neutral-500 hover:bg-white/[0.06] hover:text-white"} flex h-11 w-full items-center rounded-xl px-3 text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:-translate-y-px`}
                  >
                    <Icon size={19} strokeWidth={isActive ? 2.4 : 2} className="relative z-10" />
                    {!collapsed && (
                      <span className="relative z-10 ml-3 flex-1 text-left">{label}</span>
                    )}
                    {!collapsed && badge && (
                      <span
                        className={`${isActive ? "border border-white/15 bg-white/10 text-white" : "bg-zinc-800 text-neutral-300"} relative z-10 rounded-md px-1.5 py-0.5 text-[11px] font-semibold`}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="mt-auto space-y-1.5">
            {!collapsed && (
              <section className="mb-3 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#191a1d] to-[#111214] p-3" aria-label="Today tasks">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
                    <CalendarDays size={17} /> Today
                  </div>
                  <ChevronRight size={16} className="text-neutral-500" />
                </div>
                <p className="mt-3 text-lg font-semibold tracking-tight text-white">{2 - completedTasks.length} tasks due</p>
                <p className="mt-1 text-xs text-neutral-500">Keep going — you&apos;re on track.</p>
                <div className="mt-3 flex items-center gap-2.5" aria-label={`${completedTasks.length} of 2 tasks complete`}>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-white to-neutral-300 transition-all" style={{ width: `${Math.max(1, completedTasks.length) * 50}%` }} />
                  </div>
                  <span className="text-[11px] font-medium text-neutral-300">{completedTasks.length}/2</span>
                </div>
                <div className="mt-3 space-y-1">
                  {["Design System Notes", "Math Assignment"].map((task) => {
                    const done = completedTasks.includes(task);
                    return (
                      <button key={task} onClick={() => setCompletedTasks((current) => done ? current.filter((item) => item !== task) : [...current, task])} className="flex w-full items-center gap-2 rounded-lg py-1 text-left text-xs text-neutral-300 transition hover:text-white">
                        <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${done ? "border-white bg-white text-zinc-900" : "border-zinc-600"}`}>{done && <Check size={11} strokeWidth={3} />}</span>
                        <span className={done ? "text-neutral-500 line-through" : ""}>{task}</span>
                      </button>
                    );
                  })}
                </div>
                <Link href="/resources" className="mt-2 flex h-9 items-center gap-2 rounded-xl bg-white/[0.08] px-2.5 text-xs font-medium text-neutral-200 transition hover:bg-white/[0.13]">
                  <BookOpen size={15} /> Continue studying <ArrowRight size={15} className="ml-auto" />
                </Link>
              </section>
            )}
            <button
              onClick={handleSignOut}
              title={collapsed ? "Sign out" : undefined}
              className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-neutral-500 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={18} />
              {!collapsed && <span className="ml-3">Sign out</span>}
            </button>
          </div>
        </aside>
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
          />
        )}
        <section className="min-w-0 flex-1 overflow-y-auto bg-zinc-950">
          <header className="sticky top-0 z-10 flex h-[76px] items-center border-b border-zinc-800 bg-zinc-950 px-5 sm:px-8">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="mr-3 grid size-10 shrink-0 place-items-center rounded-xl text-neutral-300 transition hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="relative min-w-0 flex-1 max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                size={18}
              />
              <input
                aria-label="Search"
                placeholder="Search anything..."
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-[76px] text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-neutral-500 focus:ring-4 focus:ring-zinc-800"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10px] font-medium text-neutral-300">
                <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-1">⌘</kbd>
                <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-1">K</kbd>
              </span>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                aria-label="Messages"
                className="grid size-10 place-items-center rounded-xl text-neutral-300 transition hover:bg-white/10 hover:text-white"
              >
                <MessageCircle size={20} />
              </button>
              <button
                aria-label="Notifications"
                className="relative grid size-10 place-items-center rounded-xl text-neutral-300 transition hover:bg-white/10 hover:text-white"
              >
                <Bell size={20} />
                <span className="absolute right-2.5 top-2.5 size-2 rounded-full border-2 border-zinc-950 bg-white" />
              </button>
              <button className="hidden items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-black shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition hover:bg-neutral-200 sm:flex">
                <Plus size={17} />
                New project
              </button>
              <div className="mx-1 hidden h-8 w-px bg-white/10 sm:block" />
              <Link
                href="/profile"
                aria-label={`Open ${profileName} profile`}
                title={profileName}
                className="group flex shrink-0 items-center gap-1 rounded-xl px-1.5 py-1 text-neutral-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                <span className="grid size-9 place-items-center overflow-hidden rounded-full border border-white/35 bg-gradient-to-br from-zinc-100 to-zinc-400 text-xs font-bold text-zinc-900 shadow-[0_0_0_3px_rgba(255,255,255,0.08)]">
                  {profileImage ? (
                    <Image
                      src={profileImage}
                      alt=""
                      width={36}
                      height={36}
                      unoptimized
                      className="size-full object-cover"
                    />
                  ) : (
                    profileInitials
                  )}
                </span>
                <ChevronDown size={14} className="hidden sm:block" />
              </Link>
            </div>
          </header>
          <div className="p-5 sm:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

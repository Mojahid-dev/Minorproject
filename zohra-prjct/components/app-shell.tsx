"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FolderKanban,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings2,
  Upload,
  UserRound,
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
                    className={`${isActive ? "bg-white text-black" : "text-neutral-500 hover:bg-white/10 hover:text-white"} flex h-11 w-full items-center rounded-xl px-3 text-sm font-medium transition`}
                  >
                    <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                    {!collapsed && (
                      <span className="ml-3 flex-1 text-left">{label}</span>
                    )}
                    {!collapsed && badge && (
                      <span
                        className={`${isActive ? "bg-black text-white" : "bg-zinc-800 text-neutral-300"} rounded-md px-1.5 py-0.5 text-[11px] font-semibold`}
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
            <button
              title={collapsed ? "Help centre" : undefined}
              className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-neutral-500 transition hover:bg-white/10 hover:text-white"
            >
              <CircleHelp size={19} />
              {!collapsed && <span className="ml-3">Help centre</span>}
            </button>
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              title={collapsed ? "Profile" : undefined}
              className={`${pathname === "/profile" ? "bg-white text-black" : "text-neutral-500 hover:bg-white/10 hover:text-white"} flex h-10 w-full items-center rounded-xl px-3 text-sm transition`}
            >
              <UserRound size={19} />
              {!collapsed && <span className="ml-3">Profile</span>}
            </Link>
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              title={collapsed ? "Settings" : undefined}
              className={`${pathname.startsWith("/settings") ? "bg-white text-black" : "text-neutral-500 hover:bg-white/10 hover:text-white"} flex h-10 w-full items-center rounded-xl px-3 text-sm transition`}
            >
              <Settings2 size={19} />
              {!collapsed && <span className="ml-3">Settings</span>}
            </Link>
            <div className="my-3 h-px bg-zinc-800" />
            <div
              className={`${collapsed ? "justify-center" : ""} flex items-center px-2 py-1`}
            >
              <div className="grid size-9 place-items-center overflow-hidden rounded-full bg-white text-xs font-bold text-black">
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt="Profile photo"
                    width={36}
                    height={36}
                    unoptimized
                    className="size-full object-cover"
                  />
                ) : (
                  profileInitials
                )}
              </div>
              {!collapsed && (
                <div className="ml-2.5 min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {profileName}
                  </p>
                  <p className="truncate text-xs text-neutral-400">
                    {session?.user?.email || "admin@zohra.app"}
                  </p>
                </div>
              )}
              {!collapsed && (
                <ChevronDown size={16} className="text-neutral-400" />
              )}
            </div>
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
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-neutral-500 focus:ring-4 focus:ring-zinc-800"
              />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                aria-label="Messages"
                className="hidden size-10 place-items-center rounded-xl text-neutral-300 transition hover:bg-white/10 hover:text-white sm:grid"
              >
                <MessageCircle size={20} />
              </button>
              <button
                aria-label="Notifications"
                className="relative hidden size-10 place-items-center rounded-xl text-neutral-300 transition hover:bg-white/10 hover:text-white sm:grid"
              >
                <Bell size={20} />
                <span className="absolute right-2.5 top-2.5 size-2 rounded-full border-2 border-zinc-950 bg-white" />
              </button>
              <Link
                href="/upload"
                aria-label="Add new project and upload documents"
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition hover:bg-neutral-200 sm:px-3.5"
              >
                <Plus size={17} />
                <span className="sm:hidden">Add a project</span>
                <span className="hidden sm:inline">Add new project</span>
              </Link>
            </div>
          </header>
          <div className="p-5 sm:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

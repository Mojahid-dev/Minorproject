"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Home,
  Ellipsis,
  LayoutGrid,
  ListTodo,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sun,
  Moon,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
import { signOutAndClearCookies, useSession } from "@/lib/auth-client";
import { localDateString, type TaskRecord } from "@/lib/task-utils";
import { useTheme } from "next-themes";

const navigation = [
  { label: "Overview", href: "/dashboard", icon: Home },
  {
    label: "Resources",
    href: "/resources",
    icon: FolderKanban,
    badge: "resources",
  },
  { label: "Tasks", href: "/tasks", icon: LayoutGrid, badge: "tasks" },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Zohra AI", href: "/ai-test", icon: MessageCircle },
  { label: "Team", icon: UsersRound, unavailable: true },
  { label: "Upload", href: "/upload", icon: Upload },
];

function MobileNavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-[color,transform] duration-200 motion-reduce:transition-none active:scale-95 ${active ? "text-white" : "text-neutral-500 hover:text-neutral-200"}`}
    >
      <span
        className={`relative grid size-9 place-items-center rounded-[14px] transition-[background-color,transform] duration-300 ${active ? "-translate-y-0.5 bg-white/[0.12] text-white" : "text-current group-hover:bg-white/[0.05]"}`}
      >
        <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
        {active && (
          <span className="absolute -bottom-1.5 size-1 rounded-full bg-violet-200" />
        )}
      </span>
      {badge ? (
        <span
          aria-label={`${badge} active tasks`}
          className="absolute right-[calc(50%-1.4rem)] top-1 grid min-h-4 min-w-4 place-items-center rounded-full border-2 border-[#111214] bg-violet-200 px-1 text-[9px] font-bold leading-none text-zinc-950"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

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
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [resourceCount, setResourceCount] = useState<number | null>(null);
  const [isRecognized, setIsRecognized] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isLightTheme = resolvedTheme === "light";
  const { data: session } = useSession();
  const profileName = session?.user?.name || "Zohra";
  const profileImage = session?.user?.image || "";
  const profileInitials =
    profileName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "Z";
  const today = localDateString();
  const todaysTasks = tasks.filter((task) => task.dueDate === today);
  const completedToday = todaysTasks.filter((task) =>
    Boolean(task.completedAt),
  ).length;
  const remainingToday = todaysTasks.length - completedToday;
  const activeTaskCount = tasks.filter((task) => !task.completedAt).length;

  const refreshSidebarData = useCallback(async () => {
    const [taskResult, resourceResult] = await Promise.allSettled([
      fetch("/api/tasks", { cache: "no-store" }),
      fetch("/api/resources", { cache: "no-store" }),
    ]);
    if (taskResult.status === "fulfilled" && taskResult.value.ok) {
      const payload = await taskResult.value.json();
      if (Array.isArray(payload.tasks)) setTasks(payload.tasks as TaskRecord[]);
    }
    if (resourceResult.status === "fulfilled" && resourceResult.value.ok) {
      const payload = await resourceResult.value.json();
      if (Array.isArray(payload.resources))
        setResourceCount(payload.resources.length);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSidebarData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSidebarData, pathname]);

  useEffect(() => {
    let active = true;
    fetch("/api/recognition-request", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json();
        if (active) setIsRecognized(payload.request?.status === "APPROVED");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    if (!mobileMoreOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMoreOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMoreOpen]);

  useEffect(() => {
    window.addEventListener("zohra:tasks-updated", refreshSidebarData);
    return () =>
      window.removeEventListener("zohra:tasks-updated", refreshSidebarData);
  }, [refreshSidebarData]);

  async function handleSignOut() {
    try {
      await signOutAndClearCookies();
    } finally {
      router.push("/");
    }
  }

  async function toggleTask(task: TaskRecord) {
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completedAt }),
    });
    if (response.ok) await refreshSidebarData();
  }

  return (
    <main className="workspace-shell min-h-dvh w-full min-w-0 overflow-x-clip bg-zinc-950 text-neutral-100 lg:h-dvh lg:overflow-hidden">
      <div className="flex min-h-dvh w-full min-w-0 flex-col border-zinc-800 bg-zinc-950 lg:h-full lg:flex-row lg:overflow-hidden lg:border lg:shadow-[0_25px_80px_rgba(0,0,0,0.4)]">
        <aside
          className={`${collapsed ? "lg:w-[86px]" : "lg:w-[272px]"} hidden shrink-0 flex-col border-r border-zinc-800 bg-black px-4 py-5 transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:overflow-y-auto`}
        >
          <div className="flex items-center justify-between px-2">
            <ZohraMark compact={collapsed} />
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                className="hidden size-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-white/10 hover:text-white lg:grid"
              >
                <ChevronLeft size={18} />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="mt-5 hidden size-10 place-items-center self-center rounded-xl bg-zinc-800 text-white transition hover:bg-zinc-700 lg:grid"
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
            <nav aria-label="Workspace navigation" className="space-y-1.5">
              {navigation.map(
                ({ label, href, icon: Icon, badge, unavailable }) => {
                  const isActive = Boolean(
                    href &&
                    (href === "/dashboard"
                      ? pathname === href
                      : pathname.startsWith(href)),
                  );
                  const count =
                    badge === "resources"
                      ? resourceCount
                      : badge === "tasks"
                        ? activeTaskCount
                        : null;
                  const className = `flex h-11 w-full items-center rounded-xl border px-3 text-sm font-medium transition ${isActive ? "relative isolate overflow-hidden border-white/15 bg-white/[0.09] text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)]" : "border-transparent text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-200"} ${unavailable ? "cursor-not-allowed opacity-60" : ""}`;
                  const content = (
                    <>
                      <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                      <span className="ml-3 flex-1 text-left">
                        {!collapsed && label}
                      </span>
                      {!collapsed && unavailable && (
                        <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
                          Soon
                        </span>
                      )}
                      {!collapsed && badge && count !== null && (
                        <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-300">
                          {count}
                        </span>
                      )}
                    </>
                  );
                  if (unavailable || !href)
                    return (
                      <div
                        key={label}
                        aria-disabled="true"
                        title="Team collaboration is coming soon"
                        className={className}
                      >
                        {content}
                      </div>
                    );
                  return (
                    <Link
                      key={label}
                      href={href}
                      title={collapsed ? label : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={className}
                    >
                      {content}
                    </Link>
                  );
                },
              )}
            </nav>
          </div>

          <div className="mt-auto space-y-1.5">
            {!collapsed && (
              <section
                className="mb-3 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#191a1d] to-[#111214] p-3"
                aria-label="Today tasks"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/calendar?date=${today}`}
                    className="flex items-center gap-2 text-sm font-semibold text-neutral-200 hover:text-white"
                  >
                    <CalendarDays size={17} /> Today
                  </Link>
                  <Link
                    href={`/tasks?date=${today}`}
                    aria-label="Open today’s tasks"
                    className="grid size-7 place-items-center rounded-md text-neutral-500 hover:bg-white/10 hover:text-white"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
                <p className="mt-3 text-lg font-semibold tracking-tight text-white">
                  {remainingToday} task{remainingToday === 1 ? "" : "s"} due
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {todaysTasks.length === 0
                    ? "Nothing due today. Take a breather."
                    : remainingToday === 0
                      ? "Everything due today is complete."
                      : "A little progress goes a long way."}
                </p>
                <div
                  className="mt-3 flex items-center gap-2.5"
                  role="progressbar"
                  aria-label="Today’s task completion"
                  aria-valuemin={0}
                  aria-valuemax={todaysTasks.length || 1}
                  aria-valuenow={completedToday}
                >
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-white to-neutral-300 transition-all"
                      style={{
                        width: `${todaysTasks.length ? (completedToday / todaysTasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-neutral-300">
                    {completedToday}/{todaysTasks.length}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {todaysTasks.slice(0, 2).map((task) => (
                    <button
                      key={task.id}
                      disabled={false}
                      onClick={() => void toggleTask(task)}
                      aria-label={`${task.completedAt ? "Reopen" : "Complete"} ${task.title}`}
                      aria-pressed={Boolean(task.completedAt)}
                      className="flex w-full min-w-0 items-center gap-2 rounded-md py-1 text-left text-xs text-neutral-300 hover:text-white"
                    >
                      <span
                        className={`grid size-4 shrink-0 place-items-center rounded-full border ${task.completedAt ? "border-white bg-white text-zinc-900" : "border-zinc-600"}`}
                      >
                        {task.completedAt && (
                          <span
                            aria-hidden="true"
                            className="text-[10px] font-bold"
                          >
                            ✓
                          </span>
                        )}
                      </span>
                      <span
                        className={`truncate ${task.completedAt ? "text-neutral-500 line-through" : ""}`}
                      >
                        {task.title}
                      </span>
                    </button>
                  ))}
                  {todaysTasks.length > 2 && (
                    <p className="pl-6 text-[11px] text-neutral-500">
                      +{todaysTasks.length - 2} more today
                    </p>
                  )}
                  {todaysTasks.length === 0 && (
                    <Link
                      href="/tasks"
                      className="block rounded-md py-1 text-xs text-neutral-400 hover:text-white"
                    >
                      Add a task for today
                    </Link>
                  )}
                </div>
                <Link
                  href={`/tasks?date=${today}`}
                  className="mt-2 flex h-9 items-center gap-2 rounded-xl bg-white/[0.08] px-2.5 text-xs font-medium text-neutral-200 transition hover:bg-white/[0.13]"
                >
                  <ListTodo size={15} /> View today&apos;s tasks{" "}
                  <ArrowRight size={15} className="ml-auto" />
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

        <section className="mobile-app-content min-w-0 flex-1 overflow-x-clip bg-zinc-950 lg:min-h-0 lg:overflow-y-auto">
          <header className="mobile-app-header sticky top-0 z-10 flex h-16 items-center border-b border-zinc-800 bg-zinc-950/95 px-3 backdrop-blur-xl sm:h-[76px] sm:px-6 lg:px-8">
            <Link
              href="/dashboard"
              className="mr-3 flex min-w-0 shrink items-center lg:hidden"
            >
              <ZohraMark />
            </Link>
            <div className="relative hidden min-w-0 max-w-sm flex-1 lg:block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
                size={18}
              />
              <input
                aria-label="Search coming soon"
                title="Search is coming soon"
                disabled
                placeholder="Search coming soon"
                className="h-10 w-full cursor-not-allowed rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-3 text-sm text-neutral-500 placeholder:text-neutral-600"
              />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                aria-label="Messages coming soon"
                title="Messages are coming soon"
                disabled
                className="hidden size-10 cursor-not-allowed place-items-center rounded-xl text-neutral-600 sm:grid"
              >
                <MessageCircle size={20} />
              </button>
              <button
                aria-label="Notifications coming soon"
                title="Notifications are coming soon"
                disabled
                className="hidden size-10 cursor-not-allowed place-items-center rounded-xl text-neutral-600 sm:grid"
              >
                <Bell size={20} />
              </button>
              <Link
                href="/upload"
                aria-label="Add resources"
                className="hidden items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-black shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition hover:bg-neutral-200 lg:flex"
              >
                <Plus size={17} />
                Add resources
              </Link>
              <button
                type="button"
                onClick={() => setTheme(isLightTheme ? "dark" : "light")}
                aria-label={`Switch to ${isLightTheme ? "dark" : "light"} mode`}
                title={`Switch to ${isLightTheme ? "dark" : "light"} mode`}
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300 transition hover:bg-white/[0.1] hover:text-white motion-reduce:transition-none"
              >
                <span className="transition-transform duration-300 hover:rotate-12 motion-reduce:transition-none">
                  {isLightTheme ? <Moon size={17} /> : <Sun size={17} />}
                </span>
              </button>
              <div className="mx-1 hidden h-8 w-px bg-white/10 sm:block" />
              <Link
                href="/profile"
                aria-label={`Open ${profileName} profile${isRecognized ? ", Zohra recognized" : ""}`}
                title={isRecognized ? `${profileName} · Zohra Recognized` : profileName}
                className="group flex shrink-0 items-center gap-1 rounded-xl px-1.5 py-1 text-neutral-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                <span className="relative grid size-9 place-items-center overflow-visible rounded-full border border-white/35 bg-gradient-to-br from-zinc-100 to-zinc-400 text-xs font-bold text-zinc-900">
                  <span className="grid size-full place-items-center overflow-hidden rounded-full">
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
                  {isRecognized && <span aria-hidden="true" className="absolute -bottom-1 -right-1 grid size-[18px] place-items-center rounded-full border-2 border-zinc-950 bg-violet-200 text-violet-950 shadow"><BadgeCheck size={12} strokeWidth={3} /></span>}
                </span>
                <ChevronDown size={14} className="hidden sm:block" />
              </Link>
            </div>
          </header>
          <div className="w-full min-w-0 p-3 pb-[calc(6.75rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6.75rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-8">
            {children}
          </div>
        </section>
        <>
          {mobileMoreOpen && (
            <button
              type="button"
              aria-label="Close more navigation"
              onClick={() => setMobileMoreOpen(false)}
              className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            />
          )}
          <div className="mobile-app-dock fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 motion-safe:animate-mobile-dock-in lg:hidden">
            {mobileMoreOpen && (
              <div
                role="menu"
                aria-label="More workspace links"
                className="absolute bottom-[calc(100%+0.75rem)] right-3 z-50 max-h-[min(70dvh,34rem)] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#191a1d] p-2 shadow-2xl"
              >
                <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Your workspace
                </p>
                <Link
                  role="menuitem"
                  href="/ai-test"
                  onClick={() => setMobileMoreOpen(false)}
                  aria-current={pathname.startsWith("/ai-test") ? "page" : undefined}
                  className={`mb-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${pathname.startsWith("/ai-test") ? "bg-violet-200/10 text-violet-100" : "text-neutral-300 hover:bg-white/[0.07] hover:text-white"}`}
                >
                  <MessageCircle size={18} /> Zohra AI
                </Link>
                <section
                  aria-label="Today tasks"
                  className="mb-2 rounded-xl border border-white/[0.07] bg-black/25 p-3"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      role="menuitem"
                      href={`/tasks?date=${today}`}
                      onClick={() => setMobileMoreOpen(false)}
                      className="flex items-center gap-2 text-sm font-semibold text-neutral-100"
                    >
                      <CalendarDays size={16} />
                      Today
                    </Link>
                    <span className="text-[11px] text-neutral-400">
                      {completedToday}/{todaysTasks.length} done
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
                    role="progressbar"
                    aria-label="Today task progress"
                    aria-valuemin={0}
                    aria-valuemax={todaysTasks.length || 1}
                    aria-valuenow={completedToday}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-200 to-sky-100 transition-[width] duration-500"
                      style={{
                        width: `${todaysTasks.length ? (completedToday / todaysTasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 space-y-1">
                    {todaysTasks.slice(0, 2).map((task) => (
                      <button
                        key={task.id}
                        role="menuitemcheckbox"
                        aria-checked={Boolean(task.completedAt)}
                        onClick={() => void toggleTask(task)}
                        className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-1 text-left text-xs text-neutral-300 hover:bg-white/[0.05]"
                      >
                        <span
                          className={`grid size-4 shrink-0 place-items-center rounded-full border ${task.completedAt ? "border-violet-200 bg-violet-200 text-zinc-950" : "border-zinc-600"}`}
                        >
                          {task.completedAt && (
                            <span className="text-[10px] font-bold">✓</span>
                          )}
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate ${task.completedAt ? "text-neutral-500 line-through" : ""}`}
                        >
                          {task.title}
                        </span>
                      </button>
                    ))}
                    {todaysTasks.length === 0 && (
                      <p className="px-1 py-1 text-xs text-neutral-500">
                        Nothing due today. Enjoy the breathing room.
                      </p>
                    )}
                    {todaysTasks.length > 2 && (
                      <p className="pl-7 text-[11px] text-neutral-500">
                        +{todaysTasks.length - 2} more today
                      </p>
                    )}
                  </div>
                  <Link
                    role="menuitem"
                    href={`/tasks?date=${today}`}
                    onClick={() => setMobileMoreOpen(false)}
                    className="mt-2 flex min-h-9 items-center justify-between rounded-lg bg-white/[0.07] px-2.5 text-xs font-medium text-neutral-200"
                  >
                    Open today&apos;s tasks
                    <ArrowRight size={14} />
                  </Link>
                </section>
                <Link
                  role="menuitem"
                  href="/resources"
                  onClick={() => setMobileMoreOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm text-neutral-200 hover:bg-white/[0.07]"
                >
                  <FolderKanban size={18} />
                  Resources
                  {resourceCount !== null && (
                    <span className="ml-auto rounded-md bg-white/[0.08] px-2 py-0.5 text-xs text-neutral-300">
                      {resourceCount}
                    </span>
                  )}
                </Link>
                <Link
                  role="menuitem"
                  href="/profile"
                  onClick={() => setMobileMoreOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm text-neutral-200 hover:bg-white/[0.07]"
                >
                  <UserRound size={18} />
                  Profile
                </Link>
                <Link
                  role="menuitem"
                  href="/settings"
                  onClick={() => setMobileMoreOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm text-neutral-200 hover:bg-white/[0.07]"
                >
                  <Settings size={18} />
                  Settings
                </Link>
                <button
                  role="menuitem"
                  onClick={() => setTheme(isLightTheme ? "dark" : "light")}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-neutral-200 transition hover:bg-white/[0.07]"
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-violet-200/10 text-violet-100">
                    {isLightTheme ? <Moon size={17} /> : <Sun size={17} />}
                  </span>
                  {isLightTheme
                    ? "Switch to dark mode"
                    : "Switch to light mode"}
                </button>
                <div className="my-1 border-t border-white/[0.07]" />
                <button
                  role="menuitem"
                  onClick={() => void handleSignOut()}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-neutral-400 hover:bg-white/[0.07] hover:text-white"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </div>
            )}
            <nav
              aria-label="Mobile navigation"
              className="relative mx-auto grid max-w-lg grid-cols-5 items-center gap-1 rounded-[26px] border border-white/[0.1] bg-[#17181c]/95 px-2 py-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            >
              <MobileNavLink
                href="/dashboard"
                label="Home"
                icon={Home}
                active={pathname === "/dashboard"}
                onNavigate={() => setMobileMoreOpen(false)}
              />
              <MobileNavLink
                href="/tasks"
                label="Tasks"
                icon={ListTodo}
                active={pathname.startsWith("/tasks")}
                badge={activeTaskCount || undefined}
                onNavigate={() => setMobileMoreOpen(false)}
              />
              <Link
                href="/upload"
                onClick={() => setMobileMoreOpen(false)}
                aria-label="Add a resource"
                className="group flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-neutral-400"
              >
                <span className="grid size-11 place-items-center rounded-2xl border border-white/20 bg-white text-zinc-950 shadow-[0_5px_20px_rgba(255,255,255,0.16)] transition duration-300 motion-reduce:transition-none group-hover:-translate-y-1 group-hover:rotate-90 group-hover:bg-violet-100 group-active:scale-90">
                  <Plus size={22} strokeWidth={2.2} />
                </span>
                <span>Add</span>
              </Link>
              <MobileNavLink
                href="/calendar"
                label="Calendar"
                icon={CalendarDays}
                active={pathname.startsWith("/calendar")}
                onNavigate={() => setMobileMoreOpen(false)}
              />
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={mobileMoreOpen}
                onClick={() => setMobileMoreOpen((open) => !open)}
                className={`group flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-colors ${mobileMoreOpen || pathname.startsWith("/resources") || pathname.startsWith("/profile") || pathname.startsWith("/settings") ? "text-white" : "text-neutral-500 hover:text-neutral-200"}`}
              >
                <span
                  className={`grid size-9 place-items-center rounded-[14px] transition-all duration-300 motion-reduce:transition-none ${mobileMoreOpen ? "-translate-y-0.5 rotate-90 bg-white/[0.12]" : "group-hover:bg-white/[0.05]"}`}
                >
                  <Ellipsis size={21} strokeWidth={2} />
                </span>
                <span>More</span>
              </button>
            </nav>
          </div>
        </>
      </div>
    </main>
  );
}

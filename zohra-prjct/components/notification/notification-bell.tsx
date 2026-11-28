"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, CalendarClock, CheckCheck, FileCheck2, ListChecks, Settings, X } from "lucide-react";
import { useNotifications, type InboxNotification } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, typeof Bell> = {
  TASK_DUE: ListChecks,
  EXAM_SOON: CalendarClock,
  AI_FILE_READY: FileCheck2,
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Row({
  item,
  onOpen,
  onRemove,
}: {
  item: InboxNotification;
  onOpen: (item: InboxNotification) => void;
  onRemove: (item: InboxNotification) => void;
}) {
  const Icon = TYPE_ICONS[item.type] ?? BellRing;
  const unread = !item.readAt;
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3 pr-11 text-left transition hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none",
          unread && "bg-white/[0.03]",
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
            unread ? "bg-lime-200 text-zinc-950" : "bg-white/[0.08] text-neutral-400",
          )}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cn("truncate text-sm", unread ? "font-semibold text-white" : "font-medium text-neutral-300")}>
              {item.title}
            </span>
            {unread && <span className="size-2 shrink-0 rounded-full bg-lime-300" aria-label="Unread" />}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-neutral-500">{item.body}</span>
          <span className="mt-1 block text-[11px] text-neutral-600">{timeAgo(item.createdAt)}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRemove(item)}
        aria-label={`Dismiss ${item.title}`}
        className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-neutral-600 opacity-100 transition hover:bg-white/10 hover:text-white focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  );
}

/** The header bell: unread badge, plus a panel listing recent reminders. */
export function NotificationBell() {
  const router = useRouter();
  const { items, unread, loaded, error, markRead, markAllRead, remove, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openItem(item: InboxNotification) {
    void markRead(item.id);
    setOpen(false);
    router.push(item.url);
  }

  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <div ref={wrapper}>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        title="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-9 place-items-center rounded-xl text-neutral-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60 sm:size-10"
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-lime-300 px-1 text-[10px] font-bold leading-4 text-zinc-950 ring-2 ring-zinc-950"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-3 top-full z-30 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#141518] shadow-2xl sm:right-6"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Notifications</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={unread === 0}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCheck size={14} aria-hidden="true" /> Mark all read
              </button>
              <Link
                href="/settings#notification-settings"
                onClick={() => setOpen(false)}
                aria-label="Notification settings"
                title="Notification settings"
                className="grid size-8 place-items-center rounded-lg text-neutral-400 transition hover:bg-white/10 hover:text-white"
              >
                <Settings size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="max-h-[min(26rem,70vh)] overflow-y-auto overscroll-contain">
            {!loaded ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">Loading…</p>
            ) : items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <span className="mx-auto grid size-10 place-items-center rounded-xl bg-white/[0.06] text-neutral-500">
                  <Bell size={18} aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-medium text-neutral-200">You&apos;re all caught up</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  Task, exam and file reminders will show up here.{" "}
                  <Link
                    href="/settings#notification-settings"
                    onClick={() => setOpen(false)}
                    className="font-medium text-violet-300 underline-offset-2 hover:underline"
                  >
                    Get them on your phone too
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {items.map((item) => (
                  <Row key={item.id} item={item} onOpen={openItem} onRemove={(target) => void remove(target.id)} />
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p role="alert" className="border-t border-white/[0.08] px-4 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          {items.length > 0 && (
            <div className="border-t border-white/[0.08] px-4 py-2 text-right">
              <button
                type="button"
                onClick={() => void clearAll()}
                className="text-xs font-medium text-neutral-500 transition hover:text-white"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

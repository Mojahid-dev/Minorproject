"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type InboxNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string;
  readAt: string | null;
  createdAt: string;
};

const POLL_MS = 60_000;

/**
 * The in-app inbox behind the header bell. It refreshes every minute while the
 * tab is visible, when the tab regains focus, and straight away when the
 * service worker reports that a push just arrived.
 */
export function useNotifications() {
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const mutating = useRef(0);

  const load = useCallback(async () => {
    // Skip a refresh that would overwrite an optimistic change still in flight.
    if (mutating.current > 0) return;
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { notifications: InboxNotification[]; unreadCount: number };
      if (mutating.current > 0) return;
      setItems(payload.notifications);
      setUnread(payload.unreadCount);
      setError("");
    } catch {
      setError("Could not load notifications.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Report the browser's time zone once so reminders follow the student's local clock.
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZone) {
        void fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeZone }),
        }).catch(() => undefined);
      }
    } catch {
      // Time zone is a nicety; the inbox works without it.
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === "zohra:notification") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [load]);

  /** Optimistic update; the list is re-read from the server afterwards either way. */
  const mutate = useCallback(
    async (method: "PATCH" | "DELETE", body: { id: string } | { all: true }, apply: () => void) => {
      mutating.current += 1;
      apply();
      try {
        const response = await fetch("/api/notifications", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error();
      } catch {
        setError("Could not update notifications.");
      } finally {
        mutating.current -= 1;
        void load();
      }
    },
    [load],
  );

  const markRead = useCallback(
    (id: string) => {
      const target = items.find((item) => item.id === id);
      if (!target || target.readAt) return Promise.resolve();
      return mutate("PATCH", { id }, () => {
        setItems((current) => current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
        setUnread((count) => Math.max(0, count - 1));
      });
    },
    [items, mutate],
  );

  const markAllRead = useCallback(
    () =>
      mutate("PATCH", { all: true }, () => {
        const now = new Date().toISOString();
        setItems((current) => current.map((item) => (item.readAt ? item : { ...item, readAt: now })));
        setUnread(0);
      }),
    [mutate],
  );

  const remove = useCallback(
    (id: string) => {
      const target = items.find((item) => item.id === id);
      return mutate("DELETE", { id }, () => {
        setItems((current) => current.filter((item) => item.id !== id));
        if (target && !target.readAt) setUnread((count) => Math.max(0, count - 1));
      });
    },
    [items, mutate],
  );

  const clearAll = useCallback(
    () =>
      mutate("DELETE", { all: true }, () => {
        setItems([]);
        setUnread(0);
      }),
    [mutate],
  );

  return { items, unread, loaded, error, refresh: load, markRead, markAllRead, remove, clearAll };
}

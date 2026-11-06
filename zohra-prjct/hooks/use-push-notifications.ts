"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Everything the browser has to do for push: ask permission, register the
 * service worker, subscribe, and tell the server about it.
 *
 * "needs-install" is iPhone and iPad: Apple only allows web push for sites
 * added to the Home Screen.
 */
export type PushStatus =
  | "loading"
  | "unsupported"
  | "needs-install"
  | "not-configured"
  | "blocked"
  | "off"
  | "on";

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function canPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function keyToBytes(base64Url: string) {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

async function saveSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const response = await fetch("/api/push/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Could not save this device.");
  }
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (isIos() && !isInstalled()) return setStatus("needs-install");
    if (!canPush()) return setStatus("unsupported");
    try {
      const response = await fetch("/api/push/subscription", { cache: "no-store" });
      const payload = (await response.json()) as { configured?: boolean; publicKey?: string | null };
      if (!response.ok) throw new Error();
      if (!payload.configured || !payload.publicKey) return setStatus("not-configured");
      setPublicKey(payload.publicKey);
      if (Notification.permission === "denied") return setStatus("blocked");
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription && Notification.permission === "granted") {
        // Quietly refreshes the time zone and repairs the server's copy if it went missing.
        await saveSubscription(subscription).catch(() => undefined);
        return setStatus("on");
      }
      setStatus("off");
    } catch {
      setError("Could not check notification settings. Please try again.");
      setStatus("off");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!publicKey) return;
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const options = { userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) };
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe(options);
      }
      await saveSubscription(subscription);
      setStatus("on");
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : "Could not turn on notifications.");
    } finally {
      setBusy(false);
    }
  }, [publicKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription) {
        await fetch("/api/push/subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Could not turn off notifications.");
    } finally {
      setBusy(false);
    }
  }, []);

  /** Returns a short message for the caller to show. */
  const sendTest = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      return response.ok
        ? { ok: true, message: "Test sent. It should arrive in a moment." }
        : { ok: false, message: payload?.error ?? "Could not send a test." };
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, error, enable, disable, sendTest };
}

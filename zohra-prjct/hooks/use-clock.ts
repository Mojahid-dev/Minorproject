"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const id = window.setInterval(callback, 60_000);
  return () => window.clearInterval(id);
}
const snapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const serverSnapshot = () => null;

/**
 * Current time, to the minute. `null` on the server and during hydration so
 * anything derived from the clock renders identically on both sides, then
 * fills in on the client without a hydration mismatch.
 */
export function useClock(): number | null {
  return useSyncExternalStore<number | null>(subscribe, snapshot, serverSnapshot);
}

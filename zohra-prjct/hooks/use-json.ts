"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Small fetch-on-mount hook with an explicit retry. `select` must be a stable
 * reference (declare it at module level) so the request is not re-issued.
 */
export function useJson<T>(
  url: string,
  select: (payload: unknown) => T,
  initial: T,
  fallbackError = "Something went wrong. Please try again.",
) {
  const [data, setData] = useState<T>(initial);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(url, { cache: "no-store" });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = (payload as { error?: unknown } | null)?.error;
        throw new Error(typeof message === "string" ? message : fallbackError);
      }
      setData(select(payload));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallbackError);
    } finally {
      setIsLoading(false);
    }
  }, [url, select, fallbackError]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const retry = useCallback(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  return { data, isLoading, error, retry };
}

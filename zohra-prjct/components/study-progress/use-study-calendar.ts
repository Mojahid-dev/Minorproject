"use client";

import { useCallback, useEffect, useState } from "react";

export type CalendarDay = { date: string; seconds: number; sessions: number; completedTasks: number };
export type CalendarData = {
  month: string;
  today: string;
  goalSeconds: number;
  totalSeconds: number;
  days: CalendarDay[];
  streak: { current: number; best: number } | null;
};

export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** One month of activity, plus the study streak (loaded once, not on every month change). */
export function useStudyCalendar(month: string) {
  const [data, setData] = useState<CalendarData | null>(null);
  const [streak, setStreak] = useState<CalendarData["streak"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (withStreak: boolean) => {
      setLoading(true);
      setError("");
      try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const params = new URLSearchParams({ month, timeZone });
        if (withStreak) params.set("streak", "1");
        const response = await fetch(`/api/study-calendar?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load your calendar.");
        const payload = (await response.json()) as CalendarData;
        setData(payload);
        if (payload.streak) setStreak(payload.streak);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load your calendar.");
      } finally {
        setLoading(false);
      }
    },
    [month],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(streak === null);
    // streak is only needed to decide whether to ask for it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    const refresh = () => void load(true);
    window.addEventListener("zohra:study-updated", refresh);
    window.addEventListener("zohra:tasks-updated", refresh);
    return () => {
      window.removeEventListener("zohra:study-updated", refresh);
      window.removeEventListener("zohra:tasks-updated", refresh);
    };
  }, [load]);

  return { data, streak, loading, error, retry: () => void load(true) };
}

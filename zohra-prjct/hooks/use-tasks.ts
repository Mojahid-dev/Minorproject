"use client";

import { useCallback, useEffect, useState } from "react";
import type { TaskRecord } from "@/lib/task-utils";

export function useTasks() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load tasks.");
      setTasks(payload.tasks as TaskRecord[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load tasks.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return { tasks, setTasks, isLoading, error, refresh };
}

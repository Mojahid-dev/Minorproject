"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ListPlus, ParkingSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { focusRing, panel } from "@/components/dashboard/shared";
import { notifyTasksChanged } from "@/lib/task-utils";
import { useStudyTracker } from "./study-tracker-provider";

type Note = {
  id: string;
  text: string;
  createdAt: string;
  session: { id: string; status: string; topic: string | null; subject: { name: string } | null; task: { title: string } | null };
};

function dayLabel(iso: string) {
  const date = new Date(iso);
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(date)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date);
}

const timeLabel = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** Every thought you parked during focus sessions, in one place, with a way to act on each. */
export function ParkingLotView({ onCount }: { onCount?: (count: number) => void }) {
  const tracker = useStudyTracker();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/focus/parking-lot", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load your parking lot.");
      const payload = await response.json();
      setNotes(payload.notes ?? []);
      setError("");
      onCount?.((payload.notes ?? []).length);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your parking lot.");
    }
  }, [onCount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    window.addEventListener("zohra:parking-updated", load);
    window.addEventListener("zohra:study-updated", load);
    return () => {
      window.removeEventListener("zohra:parking-updated", load);
      window.removeEventListener("zohra:study-updated", load);
    };
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const note of notes ?? []) {
      const key = dayLabel(note.createdAt);
      map.set(key, [...(map.get(key) ?? []), note]);
    }
    return [...map.entries()];
  }, [notes]);

  async function remove(note: Note, quiet = false) {
    setBusyId(note.id);
    try {
      const response = await fetch(`/api/focus/parking-lot/${note.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete this thought.");
      setNotes((current) => {
        const next = (current ?? []).filter((item) => item.id !== note.id);
        onCount?.(next.length);
        return next;
      });
      return true;
    } catch (caught) {
      if (!quiet) toast.error(caught instanceof Error ? caught.message : "Unable to delete this thought.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function makeTask(note: Note) {
    setBusyId(note.id);
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: note.text.slice(0, 180) }) });
      if (!response.ok) throw new Error("Unable to create the task.");
      notifyTasksChanged();
      await remove(note, true);
      toast.success("Added to your tasks.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to create the task.");
      setBusyId(null);
    }
  }

  async function park(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || saving) return;
    setSaving(true);
    const ok = await tracker.addParkingNote(text.trim());
    setSaving(false);
    if (ok) setText("");
  }

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4 sm:space-y-5">
      <section aria-labelledby="parking-heading" className={cn(panel, "p-4 sm:p-5")}>
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300">
            <ParkingSquare size={20} />
          </span>
          <div className="min-w-0">
            <h2 id="parking-heading" className="text-base font-semibold tracking-tight text-foreground">Parking lot</h2>
            <p className="mt-0.5 text-sm leading-5 text-muted-foreground">Thoughts that popped up while you studied, saved so you can get back to focus.</p>
          </div>
        </div>
        {tracker.active ? (
          <form onSubmit={park} className="mt-4 flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Park a thought</span>
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={500}
                placeholder="Park a thought from this session"
                className={cn("h-11 w-full rounded-xl border border-border bg-background px-3 text-sm placeholder:text-muted-foreground", focusRing)}
              />
            </label>
            <button type="submit" disabled={saving || !text.trim()} className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-violet-50 hover:bg-violet-500 disabled:opacity-50", focusRing)}>
              <Plus size={16} aria-hidden="true" /> {saving ? "Saving…" : "Park"}
            </button>
          </form>
        ) : (
          <p className="mt-4 rounded-xl bg-muted/50 px-3.5 py-3 text-sm text-muted-foreground">Start a focus session to park new thoughts. They show up here.</p>
        )}
      </section>

      {error ? (
        <div role="alert" className="rounded-xl bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}{" "}
          <button type="button" onClick={() => void load()} className="font-semibold underline underline-offset-2">Try again</button>
        </div>
      ) : notes === null ? (
        <div className={cn(panel, "p-8 text-center text-sm text-muted-foreground")}>Loading…</div>
      ) : notes.length === 0 ? (
        <section className={cn(panel, "p-6 text-center sm:p-8")}>
          <h3 className="text-lg font-semibold text-foreground">Nothing parked yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Next time a thought pulls you away mid-session, open Parking Lot in Focus Mode and jot it down. It will be waiting here.
          </p>
        </section>
      ) : (
        groups.map(([label, items]) => (
          <section key={label} aria-label={label}>
            <h3 className="px-1 pb-2 text-sm font-semibold text-muted-foreground">{label}</h3>
            <ul className="space-y-2">
              {items.map((note) => {
                const context = [note.session.subject?.name, note.session.task?.title ?? note.session.topic].filter(Boolean).join(" · ");
                return (
                  <li key={note.id} className={cn(panel, "p-4")}>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{note.text}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <p className="min-w-0 basis-full text-xs text-muted-foreground sm:basis-0 sm:flex-1 sm:truncate">
                        {timeLabel(note.createdAt)}
                        {context ? ` · ${context}` : ""}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={busyId === note.id}
                          onClick={() => void makeTask(note)}
                          className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-violet-700 hover:bg-violet-500/10 disabled:opacity-50 dark:text-violet-300", focusRing)}
                        >
                          <ListPlus size={15} aria-hidden="true" /> Make task
                        </button>
                        <button
                          type="button"
                          disabled={busyId === note.id}
                          onClick={() => void remove(note)}
                          aria-label="Delete this thought"
                          className={cn("grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-700 disabled:opacity-50 dark:hover:text-red-300", focusRing)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

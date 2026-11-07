"use client";

import { useEffect, useId, useState } from "react";
import { BellRing, CalendarClock, FileCheck2, ListChecks } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { usePushNotifications, type PushStatus } from "@/hooks/use-push-notifications";
import { cn } from "@/lib/utils";

type Switches = { pushTaskDue: boolean; pushExamSoon: boolean; pushAiFileReady: boolean };
type Preferences = Switches & { pushReminderHour: number; pushReminderIntervalMinutes: number };
type SwitchKey = keyof Switches;

const TYPES: { key: SwitchKey; label: string; description: string; icon: typeof BellRing }[] = [
  {
    key: "pushTaskDue",
    label: "Task due",
    description: "Reminders for unfinished tasks due today or overdue. Repeats stop when there is no unfinished work.",
    icon: ListChecks,
  },
  {
    key: "pushExamSoon",
    label: "Exam coming up",
    description: "A reminder 7, 3 and 1 days before a task with “exam”, “quiz” or “viva” in its title.",
    icon: CalendarClock,
  },
  {
    key: "pushAiFileReady",
    label: "AI finished a long file",
    description: "When Zohra finishes reading a big upload (30+ pages), so you can leave the page.",
    icon: FileCheck2,
  },
];

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const hourLabel = (hour: number) => `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
const REMINDER_INTERVALS = [
  { value: 30, label: "Every 30 minutes" },
  { value: 60, label: "Every hour" },
  { value: 120, label: "Every 2 hours" },
  { value: 240, label: "Every 4 hours" },
  { value: 360, label: "Every 6 hours" },
  { value: 480, label: "Every 8 hours" },
  { value: 720, label: "Every 12 hours" },
  { value: 1440, label: "Every 24 hours" },
];

const DEVICE_MESSAGES: Partial<Record<PushStatus, string>> = {
  unsupported: "This browser can’t receive push notifications. Try a recent Chrome, Edge, Firefox or Safari.",
  "needs-install": "On iPhone and iPad, add Zohra to your Home Screen first (Share, then Add to Home Screen). Open it from there to turn notifications on.",
  "not-configured": "Notifications aren’t set up on the server yet. Add the VAPID keys described in NOTIFICATIONS.md and redeploy.",
  blocked: "Notifications are blocked for this site. Allow them in your browser’s site settings, then come back.",
};

function Switch({
  checked,
  disabled,
  labelId,
  descriptionId,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  labelId: string;
  descriptionId: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full ring-1 ring-black/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-lime-200" : "bg-zinc-600",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0.5 top-0.5 size-5 rounded-full shadow transition-transform motion-reduce:transition-none",
          checked ? "translate-x-5 bg-zinc-950" : "bg-white",
        )}
      />
    </button>
  );
}

export function PushNotificationSettings() {
  const push = usePushNotifications();
  const baseId = useId();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [timeZone, setTimeZone] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/preferences", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load notification settings.");
        if (active) {
          const { pushTaskDue, pushExamSoon, pushAiFileReady, pushReminderHour, pushReminderIntervalMinutes } = payload.preferences;
          setPreferences({ pushTaskDue, pushExamSoon, pushAiFileReady, pushReminderHour, pushReminderIntervalMinutes });
          setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
      })
      .catch((caught) => {
        if (active) setMessage(caught instanceof Error ? caught.message : "Unable to load notification settings.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function update(patch: Partial<Preferences>) {
    if (!preferences) return;
    const previous = preferences;
    setPreferences({ ...preferences, ...patch });
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save this setting.");
    } catch (caught) {
      setPreferences(previous);
      setMessage(caught instanceof Error ? caught.message : "Unable to save this setting.");
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    const result = await push.sendTest();
    toast.add({ type: result.ok ? "success" : "error", description: result.message });
  }

  const deviceMessage = DEVICE_MESSAGES[push.status];
  const on = push.status === "on";

  return (
    <div className="mt-6 border-t border-zinc-800 pt-6">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-lime-200 text-zinc-950">
          <BellRing size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-white">Push notifications</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Reminders on this browser or phone, even when Zohra is closed. They are free and only ever go to your own devices.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        {push.status === "loading" ? (
          <p className="flex items-center gap-2 text-sm text-neutral-400"><Spinner /> Checking this device…</p>
        ) : deviceMessage ? (
          <p className="text-sm leading-6 text-neutral-400">{deviceMessage}</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-300">
              {on ? "Notifications are on for this device." : "Notifications are off for this device."}
            </p>
            <div className="flex flex-wrap gap-2">
              {on && (
                <button
                  type="button"
                  disabled={push.busy}
                  onClick={() => void runTest()}
                  className="min-h-10 rounded-xl border border-zinc-700 px-3.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
                >
                  Send a test
                </button>
              )}
              <button
                type="button"
                disabled={push.busy}
                onClick={() => void (on ? push.disable() : push.enable())}
                className={cn(
                  "min-h-10 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60",
                  on
                    ? "border border-zinc-700 text-neutral-200 hover:bg-white/10 hover:text-white"
                    : "bg-lime-200 text-zinc-950 hover:bg-lime-100",
                )}
              >
                {push.busy ? <Spinner /> : on ? "Turn off" : "Turn on for this device"}
              </button>
            </div>
          </div>
        )}
        {push.error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{push.error}</p>}
      </div>

      <ul className="mt-2 divide-y divide-zinc-800">
        {TYPES.map(({ key, label, description, icon: Icon }) => {
          const labelId = `${baseId}-${key}-label`;
          const descriptionId = `${baseId}-${key}-description`;
          return (
            <li key={key} className="flex items-center gap-3 py-4">
              <Icon size={18} aria-hidden="true" className="shrink-0 text-neutral-500" />
              <div className="min-w-0 flex-1">
                <p id={labelId} className="text-sm font-medium text-white">{label}</p>
                <p id={descriptionId} className="mt-0.5 text-sm leading-5 text-neutral-500">{description}</p>
              </div>
              <Switch
                checked={preferences?.[key] ?? false}
                disabled={!preferences || saving}
                labelId={labelId}
                descriptionId={descriptionId}
                onChange={(value) => void update({ [key]: value })}
              />
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
        <div className="min-w-0">
          <label htmlFor={`${baseId}-hour`} className="text-sm font-medium text-white">Start reminders at</label>
          <p className="mt-0.5 text-sm text-neutral-500">
            Task alerts repeat from this local time until no tasks are due or overdue. Delivery can be delayed by the scheduler or device{timeZone ? ` (${timeZone})` : ""}.
          </p>
        </div>
        <select
          id={`${baseId}-hour`}
          value={preferences?.pushReminderHour ?? 8}
          disabled={!preferences || saving}
          onChange={(event) => void update({ pushReminderHour: Number(event.target.value) })}
          className="h-10 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-lime-200/60 focus:ring-4 focus:ring-lime-200/10 disabled:opacity-60"
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>{hourLabel(hour)}</option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <label htmlFor={`${baseId}-interval`} className="text-sm font-medium text-white">Task reminder repeat</label>
          <select
            id={`${baseId}-interval`}
            value={preferences?.pushReminderIntervalMinutes ?? 1440}
            disabled={!preferences || saving}
            onChange={(event) => void update({ pushReminderIntervalMinutes: Number(event.target.value) })}
            className="h-10 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-lime-200/60 focus:ring-4 focus:ring-lime-200/10 disabled:opacity-60"
          >
            {REMINDER_INTERVALS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {message && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{message}</p>}
    </div>
  );
}

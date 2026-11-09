import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function localDayKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}
function addDays(key: string, amount: number) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + amount));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
const startOfUtcDay = (key: string) => new Date(`${key}T00:00:00.000Z`);

/**
 * One calendar month of study activity, per day, in the student's timezone.
 * GET /api/study-calendar?month=YYYY-MM&timeZone=Asia/Kolkata[&streak=1]
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const url = new URL(request.url);

  let timeZone = url.searchParams.get("timeZone") || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    timeZone = "UTC";
  }
  const today = localDayKey(new Date(), timeZone);
  const requested = url.searchParams.get("month") ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : today.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const firstDay = `${month}-01`;
  const lastDay = `${month}-${String(dayCount).padStart(2, "0")}`;
  // Padded UTC window; the exact grouping below uses the student's timezone.
  const from = startOfUtcDay(addDays(firstDay, -2));
  const to = startOfUtcDay(addDays(lastDay, 3));

  const wantStreak = url.searchParams.get("streak") === "1";
  const streakFrom = startOfUtcDay(addDays(today, -400));

  const [sessions, tasks, goal, streakSessions, streakTasks] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId, status: { in: ["COMPLETED", "ABANDONED"] }, endedAt: { gte: from, lt: to } },
      select: { endedAt: true, durationSeconds: true, accumulatedSeconds: true, focusSeconds: true },
    }),
    prisma.task.findMany({ where: { userId, completedAt: { gte: from, lt: to } }, select: { completedAt: true } }),
    prisma.studyGoal.findUnique({ where: { userId } }),
    wantStreak
      ? prisma.studySession.findMany({
          where: { userId, status: "COMPLETED", endedAt: { gte: streakFrom } },
          select: { endedAt: true },
        })
      : Promise.resolve([] as { endedAt: Date | null }[]),
    wantStreak
      ? prisma.task.findMany({ where: { userId, completedAt: { gte: streakFrom } }, select: { completedAt: true } })
      : Promise.resolve([] as { completedAt: Date | null }[]),
  ]);

  const days = new Map<string, { seconds: number; sessions: number; completedTasks: number }>();
  for (let i = 0; i < dayCount; i++) days.set(addDays(firstDay, i), { seconds: 0, sessions: 0, completedTasks: 0 });
  for (const item of sessions) {
    if (!item.endedAt) continue;
    const bucket = days.get(localDayKey(item.endedAt, timeZone));
    if (!bucket) continue;
    bucket.seconds += Math.max(0, item.durationSeconds ?? (item.focusSeconds > 0 ? item.focusSeconds : item.accumulatedSeconds));
    bucket.sessions += 1;
  }
  for (const task of tasks) {
    if (!task.completedAt) continue;
    const bucket = days.get(localDayKey(task.completedAt, timeZone));
    if (bucket) bucket.completedTasks += 1;
  }

  let streak: { current: number; best: number } | null = null;
  if (wantStreak) {
    const active = new Set<string>();
    for (const s of streakSessions) if (s.endedAt) active.add(localDayKey(s.endedAt, timeZone));
    for (const t of streakTasks) if (t.completedAt) active.add(localDayKey(t.completedAt, timeZone));
    // Today only breaks the streak once it is over, so start from yesterday if today is still empty.
    let cursor = active.has(today) ? today : addDays(today, -1);
    let current = 0;
    while (active.has(cursor)) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
    let best = 0;
    let run = 0;
    for (let i = -400; i <= 0; i++) {
      if (active.has(addDays(today, i))) {
        run += 1;
        best = Math.max(best, run);
      } else run = 0;
    }
    streak = { current, best };
  }

  const list = [...days.entries()].map(([date, value]) => ({ date, ...value }));
  return NextResponse.json({
    month,
    today,
    goalSeconds: (goal?.dailyTargetMinutes ?? 120) * 60,
    totalSeconds: list.reduce((sum, d) => sum + d.seconds, 0),
    days: list,
    streak,
  });
}

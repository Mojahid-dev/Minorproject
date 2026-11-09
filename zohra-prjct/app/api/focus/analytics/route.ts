import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function dayKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function addDays(key: string, amount: number) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + amount));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  let timeZone = url.searchParams.get("timeZone") || "UTC";
  try { new Intl.DateTimeFormat("en-US", { timeZone }); } catch { timeZone = "UTC"; }
  const now = new Date();
  const today = dayKey(now, timeZone);
  const start = addDays(today, -27);
  const rows = await prisma.studySession.findMany({
    where: { userId: session.user.id, status: { in: ["COMPLETED", "ABANDONED"] }, endedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 500,
    include: { subject: { select: { id: true, name: true } } },
  });
  const recent = rows.filter((row) => dayKey(row.endedAt ?? row.startedAt, timeZone) >= start);
  const daily = new Map<string, number>();
  const completedDaily = new Map<string, number>();
  const subjects = new Map<string, { name: string; seconds: number }>();
  const hours = new Map<number, { scoreTotal: number; count: number }>();
  let completed = 0, abandoned = 0, totalFocusSeconds = 0, totalAwaySeconds = 0, totalPausedSeconds = 0, ratingTotal = 0, ratingCount = 0, scoreTotal = 0, scoreCount = 0, goalCount = 0, goalCompletedCount = 0;
  for (const row of recent) {
    const seconds = Math.max(0, row.durationSeconds ?? (row.focusSeconds > 0 ? row.focusSeconds : row.accumulatedSeconds - row.awaySeconds));
    const key = dayKey(row.endedAt ?? row.startedAt, timeZone);
    daily.set(key, (daily.get(key) ?? 0) + seconds);
    if (row.status === "COMPLETED") completedDaily.set(key, (completedDaily.get(key) ?? 0) + seconds);
    totalFocusSeconds += seconds;
    totalAwaySeconds += row.awaySeconds;
    totalPausedSeconds += row.pausedSeconds;
    if (row.goalCompleted !== null) { goalCount++; if (row.goalCompleted) goalCompletedCount++; }
    if (row.status === "COMPLETED") completed++; else abandoned++;
    if (row.focusRating) { ratingTotal += row.focusRating; ratingCount++; }
    const subjectKey = row.subjectId ?? "independent";
    const subject = subjects.get(subjectKey) ?? { name: row.subject?.name ?? "Independent study", seconds: 0 };
    subject.seconds += seconds;
    subjects.set(subjectKey, subject);
    const denominator = Math.max(1, seconds + row.awaySeconds);
    const score = Math.max(0, Math.min(100, Math.round((seconds / denominator) * 100)));
    scoreTotal += score; scoreCount++;
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(row.startedAt));
    const bucket = hours.get(hour) ?? { scoreTotal: 0, count: 0 };
    bucket.scoreTotal += score; bucket.count++;
    hours.set(hour, bucket);
  }
  let streak = 0;
  let cursor = (completedDaily.get(today) ?? 0) > 0 ? today : addDays(today, -1);
  while ((completedDaily.get(cursor) ?? 0) > 0) { streak++; cursor = addDays(cursor, -1); }
  const bestHour = [...hours.entries()].map(([hour, value]) => ({ hour, score: value.scoreTotal / value.count })).sort((a, b) => b.score - a.score)[0] ?? null;
  return NextResponse.json({
    totalFocusSeconds, totalAwaySeconds, totalPausedSeconds, completed, abandoned,
    averageFocusScore: scoreCount ? Math.round(scoreTotal / scoreCount) : null,
    goalCompletionRate: goalCount ? Math.round((goalCompletedCount / goalCount) * 100) : null,
    averageFocusRating: ratingCount ? Number((ratingTotal / ratingCount).toFixed(1)) : null,
    currentStreak: streak,
    bestTimeOfDay: bestHour ? { hour: bestHour.hour, averageFocusScore: Math.round(bestHour.score) } : null,
    daily: Array.from({ length: 28 }, (_, index) => { const date = addDays(start, index); return { date, seconds: daily.get(date) ?? 0 }; }),
    bySubject: [...subjects.entries()].map(([id, value]) => ({ id, ...value })).sort((a, b) => b.seconds - a.seconds),
  });
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function localDayKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}
function addDays(key: string, amount: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
function startOfUtcDay(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const days = [7, 30, 90].includes(Number(url.searchParams.get("days")))
    ? Number(url.searchParams.get("days"))
    : 7;
  let timeZone = url.searchParams.get("timeZone") || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    timeZone = "UTC";
  }
  const userId = session.user.id;
  const today = localDayKey(new Date(), timeZone);
  const startDay = addDays(today, -(days - 1));
  // The UTC window is deliberately padded. The authoritative grouping is done in the user's IANA timezone below.
  const queryStart = startOfUtcDay(addDays(startDay, -days - 2));
  const queryEnd = startOfUtcDay(addDays(today, 3));
  const [studySessions, completedTasks, goal] = await Promise.all([
    prisma.studySession.findMany({
      where: {
        userId,
        status: "COMPLETED",
        endedAt: { gte: queryStart, lt: queryEnd },
      },
      orderBy: { endedAt: "asc" },
    }),
    prisma.task.findMany({
      where: { userId, completedAt: { gte: queryStart, lt: queryEnd } },
      select: { completedAt: true },
    }),
    prisma.studyGoal.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
  ]);
  const dayMap = new Map<string, { seconds: number; completedTasks: number }>();
  for (let i = 0; i < days; i++)
    dayMap.set(addDays(startDay, i), { seconds: 0, completedTasks: 0 });
  let totalSeconds = 0,
    todaySeconds = 0,
    previousSeconds = 0,
    currentSessionCount = 0;
  for (const item of studySessions) {
    const seconds = Math.max(
      0,
      item.durationSeconds ?? item.accumulatedSeconds,
    );
    const key = localDayKey(item.endedAt ?? item.startedAt, timeZone);
    if (key >= startDay && key <= today) {
      totalSeconds += seconds;
      currentSessionCount += 1;
      const bucket = dayMap.get(key);
      if (bucket) bucket.seconds += seconds;
      if (key === today) todaySeconds += seconds;
    } else if (key >= addDays(startDay, -days) && key < startDay)
      previousSeconds += seconds;
  }
  for (const task of completedTasks) {
    if (!task.completedAt) continue;
    const key = localDayKey(task.completedAt, timeZone);
    const bucket = dayMap.get(key);
    if (bucket) bucket.completedTasks += 1;
  }
  const activeDays = [...dayMap.values()].filter(
    (value) => value.seconds > 0 || value.completedTasks > 0,
  ).length;
  const weekStart = addDays(
    today,
    -((new Date(`${today}T00:00:00.000Z`).getUTCDay() + 6) % 7),
  );
  const weekSeconds = [...dayMap.entries()]
    .filter(([key]) => key >= weekStart)
    .reduce((sum, [, value]) => sum + value.seconds, 0);
  const daily = [...dayMap.entries()].map(([date, value]) => ({
    date,
    seconds: value.seconds,
    completedTasks: value.completedTasks,
  }));
  return NextResponse.json({
    range: days,
    todaySeconds,
    totalSeconds,
    previousSeconds,
    tasksCompleted: daily.reduce((sum, item) => sum + item.completedTasks, 0),
    sessionCount: currentSessionCount,
    activeDays,
    averageSessionSeconds: currentSessionCount
      ? Math.round(totalSeconds / currentSessionCount)
      : 0,
    weekSeconds,
    dailyGoalSeconds: goal.dailyTargetMinutes * 60,
    weeklyGoalSeconds: goal.weeklyTargetMinutes * 60,
    daily,
  });
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const PREFERENCE_SELECT = {
  emailNotifications: true,
  focusMode: true,
  pushTaskDue: true,
  pushExamSoon: true,
  pushAiFileReady: true,
  pushReminderHour: true,
  pushReminderIntervalMinutes: true,
} as const;

const PUSH_SWITCHES = ["pushTaskDue", "pushExamSoon", "pushAiFileReady"] as const;
const PUSH_REMINDER_INTERVALS = [30, 60, 120, 240, 360, 480, 720, 1440] as const;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const preferences = await prisma.userPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: PREFERENCE_SELECT,
  });
  return NextResponse.json({ preferences });
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json(
      { error: "Invalid preferences." },
      { status: 400 },
    );
  const data: {
    emailNotifications?: boolean;
    focusMode?: boolean;
    pushTaskDue?: boolean;
    pushExamSoon?: boolean;
    pushAiFileReady?: boolean;
    pushReminderHour?: number;
    pushReminderIntervalMinutes?: number;
  } = {};
  for (const key of PUSH_SWITCHES) {
    if (key in body) {
      if (typeof body[key] !== "boolean")
        return NextResponse.json(
          { error: "Notification switches must be true or false." },
          { status: 400 },
        );
      data[key] = body[key];
    }
  }
  if ("pushReminderHour" in body) {
    const hour = body.pushReminderHour;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23)
      return NextResponse.json(
        { error: "Reminder time must be a whole hour between 0 and 23." },
        { status: 400 },
      );
    data.pushReminderHour = hour;
  }
  if ("pushReminderIntervalMinutes" in body) {
    const interval = body.pushReminderIntervalMinutes;
    if (!PUSH_REMINDER_INTERVALS.includes(interval))
      return NextResponse.json(
        { error: "Choose a reminder interval from the available options." },
        { status: 400 },
      );
    data.pushReminderIntervalMinutes = interval;
  }
  if ("emailNotifications" in body) {
    if (typeof body.emailNotifications !== "boolean")
      return NextResponse.json(
        { error: "Email notifications must be true or false." },
        { status: 400 },
      );
    data.emailNotifications = body.emailNotifications;
  }
  if ("focusMode" in body) {
    if (typeof body.focusMode !== "boolean")
      return NextResponse.json(
        { error: "Focus mode must be true or false." },
        { status: 400 },
      );
    data.focusMode = body.focusMode;
  }
  if (Object.keys(data).length === 0)
    return NextResponse.json(
      { error: "No preference changes were provided." },
      { status: 400 },
    );
  const preferences = await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: PREFERENCE_SELECT,
  });
  return NextResponse.json({ preferences });
}

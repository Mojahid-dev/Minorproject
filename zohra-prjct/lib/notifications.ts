import { prisma } from "@/lib/prisma";
import { dateOnlyToDate } from "@/lib/task-utils";
import { isValidTimeZone, pushConfigured, sendPushToUser, type PushPayload } from "@/lib/push";

/** The three kinds of notification a student can switch on or off. */
export const NOTIFICATION_TYPES = {
  taskDue: { preference: "pushTaskDue", logType: "TASK_DUE" },
  examSoon: { preference: "pushExamSoon", logType: "EXAM_SOON" },
  aiFileReady: { preference: "pushAiFileReady", logType: "AI_FILE_READY" },
} as const;

/** Days before an exam when a reminder goes out. The day itself is covered by "task due". */
const EXAM_REMINDER_DAYS = [7, 3, 1];
const MAX_EXAM_PUSHES_PER_RUN = 3;
/** A file counts as long when it has this many pages, or took this long to read. */
export const LONG_FILE_PAGES = 30;
export const LONG_FILE_MS = 20_000;

/**
 * Exams are ordinary tasks, so they are recognised by their title. This keeps
 * working for tasks created by hand and by Zohra AI. If tasks ever get an
 * explicit "exam" flag, replace the body of this one function.
 */
const EXAM_PATTERN = /\b(exams?|mid-?terms?|mid-?sems?|end-?sems?|viva|quiz(?:zes)?|unit tests?|class tests?|board exams?)\b/i;
export function looksLikeExam(title: string) {
  return EXAM_PATTERN.test(title);
}

/** The calendar date and hour right now in a given time zone. */
export function localParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${pick("year")}-${pick("month")}-${pick("day")}`, hour: Number(pick("hour")) };
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function listTitles(titles: string[], max = 3) {
  const shown = titles.slice(0, max).join(", ");
  return titles.length > max ? `${shown} and ${titles.length - max} more` : shown;
}

/**
 * Writes the "already sent" record first. If another run got there before us
 * the insert fails and we skip, so a reminder can never go out twice, even
 * when the scheduler fires more often than expected.
 */
async function claim(userId: string, type: string, key: string) {
  try {
    await prisma.notificationLog.create({ data: { userId, type, key } });
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return false;
    throw error;
  }
}

async function release(userId: string, type: string, key: string) {
  await prisma.notificationLog.deleteMany({ where: { userId, type, key } });
}

/** Claims, sends, and gives the claim back if no device could be reached so the next run retries. */
async function sendOnce(userId: string, type: string, key: string, payload: PushPayload, ttlSeconds?: number) {
  if (!(await claim(userId, type, key))) return false;
  try {
    const result = await sendPushToUser(userId, payload, { ttlSeconds });
    if (result.sent === 0) {
      await release(userId, type, key);
      return false;
    }
    return true;
  } catch (error) {
    await release(userId, type, key);
    throw error;
  }
}

type UserRun = { userId: string; timeZone: string };

async function runForUser({ userId, timeZone }: UserRun, preferences: {
  pushTaskDue: boolean;
  pushExamSoon: boolean;
  pushReminderHour: number;
}, now: Date) {
  const local = localParts(now, timeZone);
  // Not yet the student's reminder time in their own time zone.
  if (local.hour < preferences.pushReminderHour) return { taskDue: 0, examSoon: 0 };
  let taskDue = 0;
  let examSoon = 0;

  if (preferences.pushTaskDue) {
    const key = local.date;
    const alreadySent = await prisma.notificationLog.findUnique({
      where: { userId_type_key: { userId, type: NOTIFICATION_TYPES.taskDue.logType, key } },
      select: { id: true },
    });
    if (!alreadySent) {
      const today = dateOnlyToDate(local.date) as Date;
      const [dueToday, overdue] = await Promise.all([
        prisma.task.findMany({
          where: { userId, completedAt: null, dueDate: today },
          orderBy: { createdAt: "asc" },
          select: { title: true },
          take: 20,
        }),
        prisma.task.count({ where: { userId, completedAt: null, dueDate: { lt: today } } }),
      ]);
      if (dueToday.length > 0) {
        const titles = dueToday.map((task) => task.title);
        const extra = overdue > 0 ? ` ${overdue} more ${overdue === 1 ? "is" : "are"} overdue.` : "";
        const sent = await sendOnce(
          userId,
          NOTIFICATION_TYPES.taskDue.logType,
          key,
          {
            title: titles.length === 1 ? `Due today: ${titles[0]}` : `${titles.length} tasks due today`,
            body: titles.length === 1 ? `Tap to open your tasks.${extra}` : `${listTitles(titles)}.${extra}`,
            url: `/tasks?date=${local.date}`,
            tag: `task-due-${local.date}`,
          },
          12 * 60 * 60,
        );
        if (sent) taskDue = 1;
      }
    }
  }

  if (preferences.pushExamSoon) {
    const milestones = EXAM_REMINDER_DAYS.map((days) => ({ days, date: addDays(local.date, days) }));
    const candidates = await prisma.task.findMany({
      where: {
        userId,
        completedAt: null,
        dueDate: { in: milestones.map((milestone) => dateOnlyToDate(milestone.date) as Date) },
      },
      orderBy: { dueDate: "asc" },
      select: { id: true, title: true, dueDate: true },
    });
    for (const task of candidates.filter((item) => looksLikeExam(item.title))) {
      if (examSoon >= MAX_EXAM_PUSHES_PER_RUN) break;
      const dueDate = task.dueDate?.toISOString().slice(0, 10);
      const milestone = milestones.find((item) => item.date === dueDate);
      if (!milestone) continue;
      const when = milestone.days === 1 ? "tomorrow" : `in ${milestone.days} days`;
      const sent = await sendOnce(
        userId,
        NOTIFICATION_TYPES.examSoon.logType,
        `${task.id}:${milestone.days}`,
        {
          title: `Exam ${when}`,
          body: `${task.title}. Open Zohra AI to revise.`,
          url: "/zohra-ai",
          tag: `exam-${task.id}`,
        },
        24 * 60 * 60,
      );
      if (sent) examSoon += 1;
    }
  }

  return { taskDue, examSoon };
}

/**
 * Called by the scheduler (see /api/cron/notifications). Safe to run as often
 * as you like: each reminder is claimed once, and each student is judged by
 * the clock in their own time zone.
 */
export async function runScheduledNotifications(now = new Date()) {
  if (!pushConfigured()) return { configured: false as const, users: 0, taskDue: 0, examSoon: 0, errors: 0 };

  // One entry per user. Their most recently used device decides the time zone.
  const subscriptions = await prisma.pushSubscription.findMany({
    orderBy: { updatedAt: "desc" },
    select: { userId: true, timeZone: true },
  });
  const zones = new Map<string, string>();
  for (const subscription of subscriptions) {
    if (!zones.has(subscription.userId)) {
      zones.set(subscription.userId, isValidTimeZone(subscription.timeZone) ? subscription.timeZone : "UTC");
    }
  }
  const userIds = [...zones.keys()];
  const stored = await prisma.userPreference.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, pushTaskDue: true, pushExamSoon: true, pushReminderHour: true },
  });
  const byUser = new Map(stored.map((row) => [row.userId, row]));

  const totals = { configured: true as const, users: userIds.length, taskDue: 0, examSoon: 0, errors: 0 };
  // Small batches keep one run fast without opening too many database connections.
  for (let start = 0; start < userIds.length; start += 10) {
    const batch = userIds.slice(start, start + 10);
    const settled = await Promise.allSettled(
      batch.map((userId) =>
        runForUser(
          { userId, timeZone: zones.get(userId) as string },
          byUser.get(userId) ?? { pushTaskDue: true, pushExamSoon: true, pushReminderHour: 8 },
          now,
        ),
      ),
    );
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        totals.taskDue += outcome.value.taskDue;
        totals.examSoon += outcome.value.examSoon;
      } else {
        totals.errors += 1;
        console.error("Notification run failed for a user:", outcome.reason);
      }
    }
  }
  return totals;
}

/**
 * "AI finished a long file": sent when Zohra has finished reading and
 * organising a big upload, so students can leave the page while it works.
 * Never throws; a failed notification must not affect the file itself.
 */
export async function notifyFileProcessed(input: {
  userId: string;
  resourceId: string;
  name: string;
  pageCount: number | null;
  elapsedMs: number;
  textStatus: string;
  organizationStatus: string;
}) {
  try {
    if (!pushConfigured()) return;
    const isLong = (input.pageCount ?? 0) >= LONG_FILE_PAGES || input.elapsedMs >= LONG_FILE_MS;
    if (!isLong) return;

    const preferences = await prisma.userPreference.findUnique({
      where: { userId: input.userId },
      select: { pushAiFileReady: true },
    });
    if (preferences && !preferences.pushAiFileReady) return;
    const hasDevice = await prisma.pushSubscription.count({ where: { userId: input.userId } });
    if (!hasDevice) return;

    // A big batch upload must not turn into a burst of buzzing.
    const recent = await prisma.notificationLog.count({
      where: {
        userId: input.userId,
        type: NOTIFICATION_TYPES.aiFileReady.logType,
        sentAt: { gt: new Date(Date.now() - 10 * 60_000) },
      },
    });
    if (recent >= 3) return;

    const name = input.name.length > 60 ? `${input.name.slice(0, 57)}…` : input.name;
    const readable = input.textStatus === "EXTRACTED";
    const body =
      input.organizationStatus === "NEEDS_REVIEW"
        ? "It needs a location. Tap to choose where it goes."
        : readable
          ? `${input.pageCount ? `${input.pageCount} pages read. ` : ""}Ready for your questions.`
          : "Zohra couldn't read any text in this file, so it can't answer questions from it.";
    await sendOnce(
      input.userId,
      NOTIFICATION_TYPES.aiFileReady.logType,
      `${input.resourceId}:${Math.floor(Date.now() / 60_000)}`,
      {
        title: `Finished reading ${name}`,
        body,
        url: `/resources/${input.resourceId}`,
        tag: `file-${input.resourceId}`,
      },
      6 * 60 * 60,
    );
  } catch (error) {
    console.error("File notification failed:", error);
  }
}

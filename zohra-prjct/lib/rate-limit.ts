import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Per-user rate limiting backed by PostgreSQL.
 *
 * Why the database: Vercel runs each request in a short-lived serverless
 * function, so an in-memory counter would reset constantly and never be shared
 * between instances. A single atomic upsert per rule works everywhere.
 *
 * Each rule is a fixed window: "at most `limit` requests per `windowSeconds`".
 * Several rules can be combined (for example 10 per minute AND 200 per day).
 */
export type RateLimitRule = { limit: number; windowSeconds: number };

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Tune these numbers to match your Gemini quota. */
export const RATE_LIMITS = {
  // Every call goes to Gemini.
  aiChat: [
    { limit: 10, windowSeconds: MINUTE },
    { limit: 200, windowSeconds: DAY },
  ],
  // Re-runs AI organizing for one file.
  resourceProcess: [{ limit: 30, windowSeconds: HOUR }],
  // Re-runs PDF text extraction.
  resourceExtract: [{ limit: 30, windowSeconds: HOUR }],
  // One call can start AI organizing for up to 50 files.
  resourceOrganize: [{ limit: 20, windowSeconds: HOUR }],
} satisfies Record<string, RateLimitRule[]>;

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function registerHit(userId: string, bucket: string, windowStart: Date) {
  const run = () =>
    prisma.rateLimit.upsert({
      where: { userId_bucket_windowStart: { userId, bucket, windowStart } },
      create: { userId, bucket, windowStart, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

  try {
    return (await run()).count;
  } catch (error) {
    // Two first requests can race to create the same row; the loser retries as an update.
    if (isUniqueViolation(error)) return (await run()).count;
    throw error;
  }
}

function describeWait(seconds: number) {
  if (seconds <= 90) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  if (seconds <= 90 * 60) return `${Math.ceil(seconds / 60)} minutes`;
  return `${Math.ceil(seconds / 3600)} hours`;
}

function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: `You are doing that too often. Please try again in ${describeWait(retryAfterSeconds)}.`,
      retryAfterSeconds,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

/** Occasionally delete old counters so the table stays small. */
function pruneOldWindows() {
  if (Math.random() > 0.01) return;
  void prisma.rateLimit
    .deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 2 * DAY * 1000) } } })
    .catch(() => undefined);
}

/**
 * Counts one request for this user and returns a ready-made 429 response when
 * a rule is exceeded, or `null` when the request may continue:
 *
 *   const limited = await enforceRateLimit(userId, "ai-chat", RATE_LIMITS.aiChat);
 *   if (limited) return limited;
 *
 * If the database check itself fails, the request is allowed and the error is
 * logged, so a missing migration cannot take the AI features down.
 */
export async function enforceRateLimit(userId: string, bucket: string, rules: RateLimitRule[]) {
  try {
    const now = Date.now();
    for (const rule of rules) {
      const windowMs = rule.windowSeconds * 1000;
      const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
      const count = await registerHit(userId, `${bucket}:${rule.windowSeconds}`, windowStart);
      if (count > rule.limit) {
        const retryAfter = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now) / 1000));
        return tooManyRequests(retryAfter);
      }
    }
    pruneOldWindows();
    return null;
  } catch (error) {
    console.error("Rate limit check failed; allowing request:", error);
    return null;
  }
}

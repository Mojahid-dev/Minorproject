import { timingSafeEqual } from "node:crypto";
import { runScheduledNotifications } from "@/lib/notifications";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Sends task and exam reminders. Vercel Cron calls this with
 * `Authorization: Bearer $CRON_SECRET` (see vercel.json). Any free scheduler
 * that can send that header works too. Running it more often is harmless.
 */
async function handle(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runScheduledNotifications());
}

export const GET = handle;
export const POST = handle;

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidTimeZone } from "@/lib/push";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 30;

const actionSchema = z.union([
  z.object({ id: z.string().min(1).max(64) }),
  z.object({ all: z.literal(true) }),
]);

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/** The newest notifications plus the unread count shown on the bell. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
      select: { id: true, type: true, title: true, body: true, url: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

/** Marks one notification, or all of them, as read. Also accepts the browser's time zone. */
export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);

  // Lets reminders reach the inbox on the student's local clock even without a push device.
  const zone = z.object({ timeZone: z.string().max(64) }).safeParse(body);
  if (zone.success) {
    if (!isValidTimeZone(zone.data.timeZone)) return NextResponse.json({ error: "Unknown time zone." }, { status: 400 });
    const current = await prisma.userPreference.findUnique({ where: { userId }, select: { timeZone: true } });
    if (current?.timeZone !== zone.data.timeZone) {
      await prisma.userPreference.upsert({
        where: { userId },
        create: { userId, timeZone: zone.data.timeZone },
        update: { timeZone: zone.data.timeZone },
      });
    }
    return NextResponse.json({ success: true });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a notification or all." }, { status: 400 });
  await prisma.notification.updateMany({
    where: { userId, readAt: null, ...("id" in parsed.data ? { id: parsed.data.id } : {}) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ success: true });
}

/** Removes one notification, or clears the whole inbox. */
export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a notification or all." }, { status: 400 });
  await prisma.notification.deleteMany({
    where: { userId, ...("id" in parsed.data ? { id: parsed.data.id } : {}) },
  });
  return NextResponse.json({ success: true });
}

import { auth } from "@/lib/auth";
import { isAllowedPushEndpoint, isValidTimeZone, pushConfigured, vapidPublicKey } from "@/lib/push";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_DEVICES_PER_USER = 10;

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
  timeZone: z.string().max(64).optional(),
});

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/** Tells the browser whether push is set up on the server and gives it the public key to subscribe with. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const devices = await prisma.pushSubscription.count({ where: { userId } });
  return NextResponse.json({ configured: pushConfigured(), publicKey: vapidPublicKey(), devices });
}

/** Saves this browser's subscription. Safe to call repeatedly: it keeps the time zone fresh. */
export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  const { endpoint, keys, timeZone } = parsed.data;
  if (!isAllowedPushEndpoint(endpoint)) {
    return NextResponse.json({ error: "This browser's push service is not supported." }, { status: 400 });
  }

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 300) || null;
  const data = {
    userId,
    p256dh: keys.p256dh,
    auth: keys.auth,
    timeZone: isValidTimeZone(timeZone) ? timeZone : "UTC",
    userAgent,
  };
  // The endpoint is unique per browser. If someone else used this browser before, it now belongs to the current user.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, ...data },
    update: data,
  });

  // Keep the newest devices only.
  const all = await prisma.pushSubscription.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (all.length > MAX_DEVICES_PER_USER) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: all.slice(MAX_DEVICES_PER_USER).map((row) => row.id) } },
    });
  }
  return NextResponse.json({ success: true });
}

/** Turns notifications off for one browser. */
export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") {
    return NextResponse.json({ error: "An endpoint is required." }, { status: 400 });
  }
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint: body.endpoint } });
  return NextResponse.json({ success: true });
}

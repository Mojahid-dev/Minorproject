import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Free browser and phone push notifications using the Web Push standard.
 *
 * No third-party service is involved. The browser hands us a subscription
 * (an address on its own push service: Google, Mozilla, Apple or Microsoft),
 * and we sign each message with our VAPID key so that service accepts it.
 *
 * Needs three environment variables: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and
 * VAPID_SUBJECT. Generate the keys once with `npx web-push generate-vapid-keys`.
 */
export type PushPayload = {
  title: string;
  body: string;
  /** Page to open when the notification is tapped. Must start with "/". */
  url?: string;
  /** A new notification with the same tag replaces the old one. */
  tag?: string;
};

export type PushSendResult = { sent: number; failed: number; removed: number };

export function pushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  );
}

export function vapidPublicKey() {
  return pushConfigured() ? (process.env.VAPID_PUBLIC_KEY as string) : null;
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  if (!pushConfigured()) {
    throw new Error("Push notifications are not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.");
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
  vapidReady = true;
}

/**
 * The server will POST to whatever address a subscription contains, so only
 * the real browser push services are accepted. This stops a signed-in user
 * from pointing the server at an internal address.
 */
const PUSH_HOST_SUFFIXES = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
];

export function isAllowedPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    return PUSH_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Sends one notification to every device the user has turned notifications on for. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  options: { ttlSeconds?: number } = {},
): Promise<PushSendResult> {
  ensureVapid();
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  const result: PushSendResult = { sent: 0, failed: 0, removed: 0 };
  if (subscriptions.length === 0) return result;

  const body = JSON.stringify({
    title: payload.title.slice(0, 120),
    body: payload.body.slice(0, 240),
    url: payload.url?.startsWith("/") ? payload.url : "/dashboard",
    tag: payload.tag,
  });

  const expired: string[] = [];
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          body,
          { TTL: options.ttlSeconds ?? 12 * 60 * 60, urgency: "normal" },
        );
        result.sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404 and 410 mean the browser revoked this subscription for good.
        if (status === 404 || status === 410) expired.push(subscription.id);
        else {
          result.failed += 1;
          console.error("Push delivery failed:", status ?? error);
        }
      }
    }),
  );

  if (expired.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } });
    result.removed = expired.length;
  }
  return result;
}

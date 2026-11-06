import { auth } from "@/lib/auth";
import { pushConfigured, sendPushToUser } from "@/lib/push";
import { enforceRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Sends a sample notification to the signed-in student's own devices so they can check it works. */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Notifications are not set up on the server yet." }, { status: 503 });
  }
  const limited = await enforceRateLimit(session.user.id, "push-test", [{ limit: 5, windowSeconds: 600 }]);
  if (limited) return limited;

  const result = await sendPushToUser(
    session.user.id,
    {
      title: "Zohra notifications are on",
      body: "You will get reminders here, even when Zohra is closed.",
      url: "/settings#notification-settings",
      tag: "push-test",
    },
    { ttlSeconds: 5 * 60 },
  );
  if (result.sent === 0) {
    return NextResponse.json(
      { error: "No device could be reached. Turn notifications off and on again on this device." },
      { status: 409 },
    );
  }
  return NextResponse.json({ success: true, sent: result.sent });
}

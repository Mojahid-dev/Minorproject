import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const goal = await prisma.studyGoal.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });
  return NextResponse.json({ goal });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const dailyTargetMinutes = Number(body?.dailyTargetMinutes);
  const weeklyTargetMinutes = Number(body?.weeklyTargetMinutes);
  if (
    !Number.isInteger(dailyTargetMinutes) ||
    dailyTargetMinutes < 15 ||
    dailyTargetMinutes > 1440 ||
    !Number.isInteger(weeklyTargetMinutes) ||
    weeklyTargetMinutes < 60 ||
    weeklyTargetMinutes > 10080
  )
    return NextResponse.json(
      {
        error:
          "Choose a daily goal between 15 and 1,440 minutes and a weekly goal between 60 and 10,080 minutes.",
      },
      { status: 400 },
    );
  const goal = await prisma.studyGoal.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      dailyTargetMinutes,
      weeklyTargetMinutes,
    },
    update: { dailyTargetMinutes, weeklyTargetMinutes },
  });
  return NextResponse.json({ goal });
}

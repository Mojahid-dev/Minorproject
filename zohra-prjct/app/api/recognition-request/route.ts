import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const declineCooldownMs = 90 * 24 * 60 * 60 * 1000;

async function signedInUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET() {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const request = await prisma.recognitionRequest.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, createdAt: true, reviewedAt: true },
  });
  const eligibleAt = request?.status === "DECLINED" && request.reviewedAt
    ? new Date(request.reviewedAt.getTime() + declineCooldownMs)
    : null;

  return NextResponse.json({
    request,
    eligibleAt: eligibleAt?.toISOString() ?? null,
    canRequest: !request || request.status === "CANCELLED" ||
      (request.status === "DECLINED" && (!eligibleAt || eligibleAt <= new Date())) ||
      request.status === "REVOKED",
  });
}

export async function POST() {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const latest = await prisma.recognitionRequest.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { status: true, reviewedAt: true },
  });
  if (latest?.status === "PENDING") {
    return NextResponse.json({ error: "Your recognition request is already pending." }, { status: 409 });
  }
  if (latest?.status === "APPROVED") {
    return NextResponse.json({ error: "Your account is already recognized." }, { status: 409 });
  }
  if (latest?.status === "DECLINED" && latest.reviewedAt) {
    const eligibleAt = new Date(latest.reviewedAt.getTime() + declineCooldownMs);
    if (eligibleAt > new Date()) {
      return NextResponse.json({ error: "You can request recognition again after the 90-day review period." }, { status: 429 });
    }
  }

  try {
    const request = await prisma.recognitionRequest.create({
      data: { userId: user.id },
      select: { id: true, status: true, createdAt: true, reviewedAt: true },
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Your recognition request is already pending." }, { status: 409 });
    }
    console.error("Unable to submit recognition request:", error);
    return NextResponse.json({ error: "Unable to submit your request right now." }, { status: 500 });
  }
}

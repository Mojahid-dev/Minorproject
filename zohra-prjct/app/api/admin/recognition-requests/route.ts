import { auth } from "@/lib/auth";
import { isRecognitionReviewer } from "@/lib/recognition-admin";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRecognitionReviewer(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.recognitionRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      reviewerId: true,
      user: { select: { id: true, name: true, email: true, emailVerified: true, image: true } },
    },
  });
  requests.sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING"));
  return NextResponse.json({ requests });
}

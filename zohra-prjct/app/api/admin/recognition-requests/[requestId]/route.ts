import { auth } from "@/lib/auth";
import { isRecognitionReviewer } from "@/lib/recognition-admin";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type Decision = "APPROVED" | "DECLINED" | "REVOKED";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRecognitionReviewer(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const decision = body?.decision as Decision | undefined;
  if (
    decision !== "APPROVED" &&
    decision !== "DECLINED" &&
    decision !== "REVOKED"
  ) {
    return NextResponse.json(
      { error: "Choose a valid review action." },
      { status: 400 },
    );
  }

  const { requestId } = await params;
  const current = await prisma.recognitionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true, status: true },
  });
  if (!current)
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (current.userId === session.user.id) {
    return NextResponse.json(
      { error: "Reviewers cannot decide their own request." },
      { status: 403 },
    );
  }

  const allowed =
    decision === "REVOKED"
      ? current.status === "APPROVED"
      : current.status === "PENDING";
  if (!allowed) {
    return NextResponse.json(
      { error: "This request has already been reviewed." },
      { status: 409 },
    );
  }

  const result = await prisma.recognitionRequest.updateMany({
    where: { id: current.id, userId: current.userId, status: current.status },
    data: {
      status: decision,
      reviewerId: session.user.id,
      reviewedAt: new Date(),
    },
  });
  if (result.count !== 1) {
    return NextResponse.json(
      { error: "This request changed before your decision was saved." },
      { status: 409 },
    );
  }
  return NextResponse.json({
    success: true,
    status: decision,
    reviewerId: session.user.id,
  });
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = await params;
  const result = await prisma.recognitionRequest.updateMany({
    where: { id: requestId, userId: session.user.id, status: "PENDING" },
    data: { status: "CANCELLED", reviewedAt: null, reviewerId: null },
  });
  if (result.count !== 1) {
    return NextResponse.json({ error: "That pending request could not be found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

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
  const userIds = [...new Set(requests.map((request) => request.user.id))];
  const [resourceCounts, completedTaskCounts] = userIds.length ? await Promise.all([
    prisma.resource.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _count: { _all: true } }),
    prisma.task.groupBy({ by: ["userId"], where: { userId: { in: userIds }, completedAt: { not: null } }, _count: { _all: true } }),
  ]) : [[], []];
  const resourceCountByUser = new Map(resourceCounts.map((item) => [item.userId, item._count._all]));
  const completedTasksByUser = new Map(completedTaskCounts.map((item) => [item.userId, item._count._all]));
  return NextResponse.json({
    requests: requests.map((request) => ({
      ...request,
      user: {
        ...request.user,
        resourceCount: resourceCountByUser.get(request.user.id) ?? 0,
        completedTaskCount: completedTasksByUser.get(request.user.id) ?? 0,
      },
    })),
  });
}

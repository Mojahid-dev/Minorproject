import { auth } from "@/lib/auth";
import { processStudyResource } from "@/lib/study-library";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { after, NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { resourceId } = await params;
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, userId: session.user.id },
    select: { id: true, status: true, organizationStatus: true, updatedAt: true },
  });
  if (!resource) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  if (resource.status !== "READY") return NextResponse.json({ error: "Wait until the upload finishes before organizing this file." }, { status: 409 });
  if (resource.organizationStatus === "PROCESSING" && resource.updatedAt.getTime() > Date.now() - 3 * 60_000) return NextResponse.json({ error: "This file is already being organized." }, { status: 409 });
  if (resource.organizationStatus === "ORGANIZED") return NextResponse.json({ error: "This file already has a course location. Move it from the library instead." }, { status: 409 });

  after(async () => {
    await processStudyResource(resource.id, true);
  });
  return NextResponse.json({ success: true });
}

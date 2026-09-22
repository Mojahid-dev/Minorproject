import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resourceId } = await params;
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, userId: session.user.id },
    select: {
      id: true,
      originalName: true,
      textExtractionStatus: true,
      extractedText: true,
      extractedTextLength: true,
      pageCount: true,
      extractionError: true,
    },
  });
  if (!resource) return NextResponse.json({ error: "Resource not found." }, { status: 404 });

  return NextResponse.json({ resource });
}

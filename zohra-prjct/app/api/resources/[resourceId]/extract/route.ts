import { auth } from "@/lib/auth";
import { extractAndStorePdfText, isPdfResource } from "@/lib/pdf-text-extraction";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resourceId } = await params;
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, userId: session.user.id },
    select: { mimeType: true, textExtractionStatus: true },
  });
  if (!resource) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  if (!isPdfResource(resource.mimeType)) return NextResponse.json({ error: "Text extraction is only available for PDFs." }, { status: 400 });
  if (resource.textExtractionStatus === "EXTRACTING") return NextResponse.json({ error: "Text extraction is already in progress." }, { status: 409 });

  await extractAndStorePdfText(resourceId);
  return NextResponse.json({ success: true });
}

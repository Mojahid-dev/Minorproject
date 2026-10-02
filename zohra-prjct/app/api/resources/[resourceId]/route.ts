import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resourceId } = await params;
  const resource = await prisma.resource.findFirst({ where: { id: resourceId, userId: session.user.id } });
  if (!resource) return NextResponse.json({ error: "Resource not found." }, { status: 404 });

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return NextResponse.json({ error: "Vercel Blob is not configured." }, { status: 503 });

  try {
    await del(resource.storageKey, { token: blobToken });
    await prisma.resource.delete({ where: { id: resource.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to remove resource:", error);
    return NextResponse.json({ error: "Unable to remove this resource." }, { status: 500 });
  }
}

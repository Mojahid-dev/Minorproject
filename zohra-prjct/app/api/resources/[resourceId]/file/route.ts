import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { get } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resourceId } = await params;
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, userId: session.user.id, status: { in: ["READY", "PROCESSING"] } },
    select: { storageKey: true, originalName: true, mimeType: true },
  });
  if (!resource) return NextResponse.json({ error: "Resource not found." }, { status: 404 });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: "Private file storage is not configured." }, { status: 503 });

  try {
    const range = request.headers.get("range");
    const blob = await get(resource.storageKey, { access: "private", token, useCache: false, headers: range ? { Range: range } : undefined });
    if (!blob?.stream) return NextResponse.json({ error: "The original file could not be found." }, { status: 404 });

    const download = new URL(request.url).searchParams.get("download") === "1";
    const safeAsciiName = resource.originalName.replace(/[\r\n"\\]/g, "_").replace(/[^\x20-\x7E]/g, "_");
    const encodedName = encodeURIComponent(resource.originalName).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    const contentRange = blob.headers.get("content-range");
    const contentLength = blob.headers.get("content-length");
    return new Response(blob.stream, {
      status: contentRange ? 206 : 200,
      headers: {
        "Content-Type": resource.mimeType || "application/octet-stream",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Accept-Ranges": blob.headers.get("accept-ranges") ?? "bytes",
        ...(contentRange ? { "Content-Range": contentRange } : {}),
        ...(contentLength ? { "Content-Length": contentLength } : {}),
      },
    });
  } catch (error) {
    console.error("Unable to stream private resource:", error);
    return NextResponse.json({ error: "Unable to open this file right now." }, { status: 502 });
  }
}

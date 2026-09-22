import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFileExtension, validateResourceFile } from "@/lib/resource-validation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resources = await prisma.resource.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ resources });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || typeof body.size !== "number" || typeof body.type !== "string") {
    return NextResponse.json({ error: "Invalid resource metadata." }, { status: 400 });
  }

  const validationError = validateResourceFile(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const extension = getFileExtension(body.name);
  const safeFileName = body.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const resourceId = crypto.randomUUID();
  const storageKey = `resources/${session.user.id}/${resourceId}/${safeFileName}`;

  const resource = await prisma.resource.create({
    data: {
      id: resourceId,
      userId: session.user.id,
      originalName: body.name,
      mimeType: body.type || "application/octet-stream",
      extension,
      sizeBytes: body.size,
      storageKey,
      status: "PENDING",
    },
  });

  return NextResponse.json({ resource }, { status: 201 });
}

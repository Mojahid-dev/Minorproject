import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_RESOURCE_SIZE_BYTES, SUPPORTED_RESOURCE_MIME_TYPES } from "@/lib/resource-validation";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type UploadPayload = { resourceId: string };

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    return NextResponse.json(
      { error: "Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN and restart the development server." },
      { status: 503 },
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: blobToken,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) throw new Error("Unauthorized");
        if (!clientPayload) throw new Error("Missing resource upload data.");

        const { resourceId } = JSON.parse(clientPayload) as UploadPayload;
        const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
        if (!resource || resource.userId !== session.user.id || resource.storageKey !== pathname) {
          throw new Error("Resource upload is not authorized.");
        }
        if (resource.status !== "PENDING") throw new Error("This resource has already been uploaded.");

        return {
          allowedContentTypes: [...SUPPORTED_RESOURCE_MIME_TYPES],
          maximumSizeInBytes: MAX_RESOURCE_SIZE_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ resourceId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) throw new Error("Missing uploaded resource data.");
        const { resourceId } = JSON.parse(tokenPayload) as UploadPayload;
        await prisma.resource.update({
          where: { id: resourceId },
          data: { status: "READY", storageKey: blob.pathname },
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Vercel Blob upload token error:", error);
    return NextResponse.json(
      { error: "Unable to authorize file upload. Check that BLOB_READ_WRITE_TOKEN is a valid token for this Vercel Blob store." },
      { status: 400 },
    );
  }
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ noteId: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { noteId } = await params;
  const result = await prisma.parkingLotNote.deleteMany({
    where: { id: noteId, session: { userId: session.user.id } },
  });
  if (result.count === 0) return NextResponse.json({ error: "Note not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Every thought the student parked during focus sessions, newest first. */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await prisma.parkingLotNote.findMany({
    where: { session: { userId: session.user.id } },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      text: true,
      createdAt: true,
      session: {
        select: {
          id: true,
          status: true,
          topic: true,
          subject: { select: { name: true } },
          task: { select: { title: true } },
        },
      },
    },
  });
  return NextResponse.json({ notes });
}

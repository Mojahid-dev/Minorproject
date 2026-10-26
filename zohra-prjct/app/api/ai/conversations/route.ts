import { auth } from "@/lib/auth";
import {
  parseChatMessages,
  titleFromMessages,
} from "@/lib/ai-conversations";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

export async function GET() {

  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const messages = parseChatMessages(body?.messages);
  if (!messages || messages.at(-1)?.role !== "assistant") {
    return NextResponse.json(
      { error: "Save a completed conversation that is within the allowed length." },
      { status: 400 }
    );
  }

  const conversation = await prisma.aIConversation.create({

    data: {
      userId,
      title: titleFromMessages(messages),
      messages: {
        create: messages.map((message, position) => ({
          role: message.role === "user" ? "USER" : "ASSISTANT",
          content: message.content,
          position,
        })),
      },
    },
    
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}

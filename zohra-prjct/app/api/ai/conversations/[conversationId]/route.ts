import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toChatRole } from "@/lib/ai-conversations";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

type RouteContext = {
  params: Promise<{ conversationId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await context.params;
  const conversation = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { position: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    conversation: {
      ...conversation,
      messages: conversation.messages.map((message) => ({
        ...message,
        role: toChatRole(message.role),
      })),
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await currentUserId();
  
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 120) {
    return NextResponse.json(
      { error: "A title between 1 and 120 characters is required." },
      { status: 400 },
    );
  }

  const { conversationId } = await context.params;
  const result = await prisma.aIConversation.updateMany({
    where: { id: conversationId, userId },
    data: { title },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  const conversation = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ conversation });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await context.params;
  const result = await prisma.aIConversation.deleteMany({
    where: { id: conversationId, userId },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}

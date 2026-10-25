import { ApiError, GoogleGenAI } from "@google/genai";
import { auth } from "@/lib/auth";
import {
  MAX_CHAT_CONTEXT_MESSAGES,
  parseChatMessages,
  toChatRole,
  type ChatMessage,
} from "@/lib/ai-conversations";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Please sign in to use Zohra AI." }, { status: 401 });

    const body = await request.json().catch(() => null);
    const messages = parseChatMessages(body?.messages);
    if (!messages || messages.at(-1)?.role !== "user") {
      return NextResponse.json({ error: "Invalid conversation. The last message must be from you." }, { status: 400 });
    }

    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;
    let history: ChatMessage[] = messages;
    if (conversationId) {
      const conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId },
        include: { messages: { orderBy: { position: "asc" } } },
      });
      if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      history = conversation.messages.map((message) => ({
        role: toChatRole(message.role),
        content: message.content,
      }));
      history.push(messages[messages.length - 1]);
      if (history.length > 100) history = history.slice(-100);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini is not configured. Add GEMINI_API_KEY to the server environment." }, { status: 503 });
    }

    const conversationInput = history.slice(-MAX_CHAT_CONTEXT_MESSAGES).map((message) => ({
      type: message.role === "assistant" ? ("model_output" as const) : ("user_input" as const),
      content: [{ type: "text" as const, text: message.content }],
    }));
    const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    const ai = new GoogleGenAI({ apiKey });
    let reply = "";
    for (const [index, model] of models.entries()) {
      try {
        const interaction = await ai.interactions.create({
          model,
          system_instruction: "You are Zohra, a helpful and conversational assistant. Answer the user's request naturally, explain clearly, and give examples when useful. Do not assume every request is academic.",
          input: conversationInput,
          generation_config: { temperature: 0.4, max_output_tokens: 1024 },
        });
        reply = interaction.output_text?.trim() ?? "";
        break;
      } catch (error) {
        const fallback = index === 0 && error instanceof ApiError && [429, 503].includes(error.status);
        if (!fallback) throw error;
        console.warn(`Gemini ${model} returned ${error.status}; trying the Flash-Lite fallback.`);
      }
    }
    if (!reply) return NextResponse.json({ error: "Gemini returned an empty reply. Please try again." }, { status: 502 });

    if (conversationId) {
      const conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true, _count: { select: { messages: true } } },
      });
      if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      const position = conversation._count.messages;
      await prisma.$transaction([
        prisma.aIMessage.create({ data: { conversationId, role: "USER", content: messages.at(-1)!.content, position } }),
        prisma.aIMessage.create({ data: { conversationId, role: "ASSISTANT", content: reply, position: position + 1 } }),
        prisma.aIConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
      ]);
    }
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI chat request failed:", error);
    const geminiError = error instanceof ApiError
      ? error.status === 401 || error.status === 403
        ? "Gemini rejected the API key. Check GEMINI_API_KEY in your Vercel environment settings."
        : error.status === 404
          ? "Gemini could not find the requested model. Check model access for your API key."
          : error.status === 429
            ? "Gemini's rate limit or free quota was reached. Try again later."
            : error.status >= 500
              ? `Google Gemini is temporarily unavailable (HTTP ${error.status}). Please try again shortly.`
              : `Gemini request failed (HTTP ${error.status}).`
      : null;
    return NextResponse.json(
      { error: geminiError ?? (error instanceof Error && error.name === "TimeoutError" ? "The AI took too long to respond." : "Unable to generate a response.") },
      { status: error instanceof ApiError ? error.status : 502 },
    );
  }
}

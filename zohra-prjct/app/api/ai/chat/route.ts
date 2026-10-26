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
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId)
      return NextResponse.json(
        { error: "Please sign in to use Zohra AI." },
        { status: 401 },
      );

    const body = await request.json().catch(() => null);
    const messages = parseChatMessages(body?.messages);
    if (!messages || messages.at(-1)?.role !== "user") {
      return NextResponse.json(
        { error: "Invalid conversation. The last message must be from you." },
        { status: 400 },
      );
    }

    const conversationId =
      typeof body?.conversationId === "string" ? body.conversationId : null;
    let history: ChatMessage[] = messages;
    if (conversationId) {
      const conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId },
        include: { messages: { orderBy: { position: "asc" } } },
      });
      if (!conversation)
        return NextResponse.json(
          { error: "Conversation not found." },
          { status: 404 },
        );
      history = conversation.messages.map((message) => ({
        role: toChatRole(message.role),
        content: message.content,
      }));
      history.push(messages[messages.length - 1]);
      if (history.length > 100) history = history.slice(-100);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini is not configured. Add GEMINI_API_KEY to the server environment.",
        },
        { status: 503 },
      );
    }

    let context = history.slice(-MAX_CHAT_CONTEXT_MESSAGES);
    if (context[0]?.role === "assistant") context = context.slice(1);
    const contents = context.map((message) => ({
      role:
        message.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: message.content }],
    }));
    const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    const ai = new GoogleGenAI({ apiKey });
    let reply = "";
    let lastGeminiError: unknown;
    for (const [index, model] of models.entries()) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction:
              "You are Zohra AI, a friendly, accurate AI assistant that helps students learn, solve problems, understand concepts, and prepare for exams. Explain clearly, encourage critical thinking, and admit uncertainty. Adapt to the user's level and preferred language; use simple English by default and Hindi or Hinglish when requested. Keep answers concise unless detail is needed. Use headings for long answers, bullets for lists, numbered steps for procedures, and code blocks for code. Respect privacy and never invent facts.",
            temperature: 0.4,
            maxOutputTokens: 1024,
            httpOptions: { timeout: 24_000 },
          },
        });
        reply = response.text?.trim() ?? "";
        if (!reply) {
          const blockReason = response.promptFeedback?.blockReason;
          const finishReason = response.candidates?.[0]?.finishReason;
          console.error("Gemini returned no text", {
            model,
            blockReason,
            finishReason,
          });
          if (blockReason || finishReason === "SAFETY") {
            return NextResponse.json(
              {
                error:
                  "Gemini could not answer that prompt because it was blocked by its safety filters. Please rephrase it and try again.",
              },
              { status: 422 },
            );
          }
        }
        break;
      } catch (error) {
        lastGeminiError = error;
        const fallback =
          index === 0 &&
          error instanceof ApiError &&
          [404, 429, 503].includes(error.status);
        if (!fallback) throw error;
        console.warn(
          `Gemini ${model} returned ${error.status}; trying ${models[index + 1]}.`,
        );
      }
    }
    if (
      lastGeminiError &&
      !reply &&
      !(
        lastGeminiError instanceof ApiError &&
        [404, 429, 503].includes(lastGeminiError.status)
      )
    ) {
      throw lastGeminiError;
    }
    if (!reply)
      return NextResponse.json(
        { error: "Gemini returned an empty reply. Please try again." },
        { status: 502 },
      );

    if (conversationId) {
      const conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true, _count: { select: { messages: true } } },
      });
      if (!conversation)
        return NextResponse.json(
          { error: "Conversation not found." },
          { status: 404 },
        );
      const position = conversation._count.messages;
      await prisma.$transaction([
        prisma.aIMessage.create({
          data: {
            conversationId,
            role: "USER",
            content: messages.at(-1)!.content,
            position,
          },
        }),
        prisma.aIMessage.create({
          data: {
            conversationId,
            role: "ASSISTANT",
            content: reply,
            position: position + 1,
          },
        }),
        prisma.aIConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        }),
      ]);
    }
    return NextResponse.json({ reply });
  } catch (error) {
    console.error(
      "AI chat request failed:",
      error instanceof Error ? error.message : error,
    );
    const geminiError =
      error instanceof ApiError
        ? error.status === 401 || error.status === 403
          ? "Service unavailable."
          : error.status === 404
            ? "Try again later. Gemini may be temporarily unavailable or the model may not exist."
            : error.status === 429
              ? "Gemini's free-tier request or token limit was reached. Check the quota for this API key in Google AI Studio and try again later."
              : error.status >= 500
                ? `Google Gemini is temporarily unavailable (HTTP ${error.status}). Check the Google AI Studio service status and try again shortly.`
                : `Gemini request failed (HTTP ${error.status}).`
        : error instanceof Error && error.name === "TimeoutError"
          ? "Gemini took too long to respond. Please try again."
          : error instanceof TypeError
            ? "The server could not reach Google Gemini. Check that the Vercel function has outbound network access and try again."
            : null;
    return NextResponse.json(
      {
        error:
          geminiError ??
          "Unable to generate a response. Check the Vercel function logs for this request.",
      },
      { status: error instanceof ApiError ? error.status : 502 },
    );
  }
}

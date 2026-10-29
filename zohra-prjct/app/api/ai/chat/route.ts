import { ApiError, GoogleGenAI } from "@google/genai";
import { auth } from "@/lib/auth";
import {
  MAX_CHAT_CONTEXT_MESSAGES,
  parseChatMessages,
  toChatRole,
  type ChatMessage,
} from "@/lib/ai-conversations";
import { buildDocumentContext, parseResourceIds, type DocumentSource } from "@/lib/document-context";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const BASE_SYSTEM_INSTRUCTION =
  "You are Zohra AI, a friendly, accurate AI assistant that helps students learn, solve problems, understand concepts, and prepare for exams. Explain clearly, encourage critical thinking, and admit uncertainty. Adapt to the user's level and preferred language; use simple English by default and Hindi or Hinglish when requested. Keep answers concise unless detail is needed. Use headings for long answers, bullets for lists, numbered steps for procedures, and code blocks for code. Respect privacy and never invent facts.";

const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
/** Time allowed until the first words arrive (this is also when we switch to the backup model). */
const FIRST_WORDS_TIMEOUT_MS = 24_000;
/** Longest silence allowed in the middle of a reply before we give up. */
const STALL_TIMEOUT_MS = 20_000;

/** A message that is safe to show to the user as it is. */
class ChatError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

/** What the browser receives: one JSON object per line. */
type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; sources: DocumentSource[] }
  | { type: "error"; error: string };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("Timed out");
      error.name = "TimeoutError";
      reject(error);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function describeError(error: unknown): { message: string; status: number } {
  if (error instanceof ChatError) return { message: error.message, status: error.status };

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

  return {
    message: geminiError ?? "Unable to generate a response. Check the Vercel function logs for this request.",
    status: error instanceof ApiError ? error.status : 502,
  };
}

async function saveExchange(userId: string, conversationId: string, userContent: string, reply: string) {
  const conversation = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, _count: { select: { messages: true } } },
  });

  if (!conversation) throw new ChatError("Conversation not found.", 404);

  const position = conversation._count.messages;

  await prisma.$transaction([
    prisma.aIMessage.create({ data: { conversationId, role: "USER", content: userContent, position } }),
    prisma.aIMessage.create({ data: { conversationId, role: "ASSISTANT", content: reply, position: position + 1 } }),
    prisma.aIConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);
}

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

    const limited = await enforceRateLimit(userId, "ai-chat", RATE_LIMITS.aiChat);
    if (limited) return limited;

    const body = await request.json().catch(() => null);

    const messages = parseChatMessages(body?.messages);

    if (!messages || messages.at(-1)?.role !== "user") {
      return NextResponse.json(
        { error: "Invalid conversation. The last message must be from you." },
        { status: 400 },
      );
    }

    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;

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

    const resourceIds = parseResourceIds(body?.resourceIds);

    if (!resourceIds) {
      return NextResponse.json(
        { error: "Invalid file selection. You can attach up to 3 files." },
        { status: 400 },
      );
    }

    let documentPrompt = "";
    let sources: DocumentSource[] = [];

    if (resourceIds.length > 0) {
      // Only the signed-in user's own files whose text is ready can be used.
      const resources = await prisma.resource.findMany({
        where: {
          id: { in: resourceIds },
          userId,
          status: "READY",
          textExtractionStatus: "EXTRACTED",
          extractedText: { not: null },
        },
        select: { id: true, originalName: true, extractedText: true },
      });

      const documents = resourceIds.flatMap((id) => {
        const resource = resources.find((item) => item.id === id);
        return resource?.extractedText
          ? [{ id, name: resource.originalName, text: resource.extractedText }]
          : [];
      });

      if (documents.length !== resourceIds.length) {
        return NextResponse.json(
          { error: "One of the selected files is not available. It may have been deleted, or its text is not ready yet." },
          { status: 404 },
        );
      }

      ({ prompt: documentPrompt, sources } = buildDocumentContext(documents));
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini is not configured.",
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

    const ai = new GoogleGenAI({ apiKey });

    const config = {
      systemInstruction: documentPrompt
        ? `${BASE_SYSTEM_INSTRUCTION}\n\n${documentPrompt}`
        : BASE_SYSTEM_INSTRUCTION,
      temperature: 0.4,
      maxOutputTokens: documentPrompt ? 2048 : 1024,
    };

    // Starts the reply and waits for the first words, so problems that happen
    // before any text exists can still be returned as normal HTTP errors.
    const openReplyStream = async () => {
      let lastError: unknown;

      for (const [index, model] of MODELS.entries()) {
        try {
          return await withTimeout(
            (async () => {
              const stream = await ai.models.generateContentStream({ model, contents, config });
              const iterator = stream[Symbol.asyncIterator]();
              let blockReason: string | undefined;
              let finishReason: string | undefined;
              let text = "";

              while (!text) {
                const next = await iterator.next();
                if (next.done) break;
                blockReason ??= next.value.promptFeedback?.blockReason;
                finishReason ??= next.value.candidates?.[0]?.finishReason;
                text = next.value.text ?? "";
              }

              return { iterator, text, blockReason, finishReason };
            })(),
            FIRST_WORDS_TIMEOUT_MS,
          );
        } catch (error) {
          lastError = error;

          const canFallBack =
            index === 0 &&
            error instanceof ApiError &&
            [404, 429, 503].includes(error.status);

          if (!canFallBack) throw error;

          console.warn(`Gemini ${model} returned ${error.status}; trying ${MODELS[index + 1]}.`);
        }
      }

      throw lastError;
    };

    const opened = await openReplyStream();

    if (!opened.text) {
      console.error("Gemini returned no text", {
        blockReason: opened.blockReason,
        finishReason: opened.finishReason,
      });

      if (opened.blockReason || opened.finishReason === "SAFETY") {
        return NextResponse.json(
          {
            error:
              "Gemini could not answer that prompt because it was blocked by its safety filters. Please rephrase it and try again.",
          },
          { status: 422 },
        );
      }

      return NextResponse.json(
        { error: "Gemini returned an empty reply. Please try again." },
        { status: 502 },
      );
    }

    const userContent = messages.at(-1)!.content;
    const encoder = new TextEncoder();
    let cancelled = false;

    const replyStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: StreamEvent) => {
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          } catch {
            /* The browser has already left. */
          }
        };

        try {
          let reply = opened.text;
          send({ type: "delta", text: opened.text });

          while (!cancelled) {
            const next = await withTimeout(opened.iterator.next(), STALL_TIMEOUT_MS);
            if (next.done) break;

            const text = next.value.text ?? "";
            if (!text) continue;

            reply += text;
            send({ type: "delta", text });
          }

          // The user left before the reply finished, so nothing is saved.
          if (cancelled) return;

          if (conversationId) {
            try {
              await saveExchange(userId, conversationId, userContent, reply.trim());
            } catch (error) {
              console.error("Saving the AI reply failed:", error instanceof Error ? error.message : error);
              throw error instanceof ChatError
                ? error
                : new ChatError("Your reply was written but could not be saved to this conversation. Please try again.");
            }
          }

          send({ type: "done", sources });
        } catch (error) {
          console.error("AI reply stream failed:", error instanceof Error ? error.message : error);
          send({ type: "error", error: describeError(error).message });
        } finally {
          try {
            controller.close();
          } catch {
            /* Already closed because the browser left. */
          }
        }
      },
      cancel() {
        cancelled = true;
        void opened.iterator.return(undefined).catch(() => undefined);
      },
    });

    return new Response(replyStream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error(
      "AI chat request failed:",
      error instanceof Error ? error.message : error,
    );

    const { message, status } = describeError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

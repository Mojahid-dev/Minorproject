
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: unknown = body.messages;

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > MAX_MESSAGES
    ) {
      return NextResponse.json(
        { error: "Invalid conversation." },
        { status: 400 }
      );
    }

    const validMessages: ChatMessage[] = [];

    for (const message of messages) {
      if (
        !message ||
        typeof message.content !== "string" ||
        !["user", "assistant"].includes(message.role) ||
        message.content.trim().length === 0 ||
        message.content.length > MAX_MESSAGE_LENGTH
      ) {
        return NextResponse.json(
          { error: "Invalid message." },
          { status: 400 }
        );
      }

      validMessages.push({
        role: message.role,
        content: message.content.trim(),
      });
    }

    if (validMessages.at(-1)?.role !== "user") {
      return NextResponse.json(
        { error: "The last message must be from the user." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.OLLAMA_BASE_URL ??
      "http://127.0.0.1:11434";

    const response = await fetch(
      `${baseUrl}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model:
            process.env.OLLAMA_MODEL ?? "llama3.2:3b",
          messages: [
            {
              role: "system",
              content:
                "You are Zohra, a helpful academic assistant. " +
                "Explain concepts clearly, use examples, and " +
                "help students understand rather than memorize.",
            },
            ...validMessages,
          ],
          stream: false,
          options: {
            temperature: 0.4,
            num_predict: 512,
          },
        }),
        signal: AbortSignal.timeout(120_000),
      }
    );

    if (!response.ok) {
      console.error("Ollama returned status:", response.status);

      return NextResponse.json(
        { error: "The local AI service is unavailable." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply = data.message?.content;

    if (typeof reply !== "string") {
      return NextResponse.json(
        { error: "Invalid response from AI." },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI chat request failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error &&
          error.name === "TimeoutError"
            ? "The AI took too long to respond."
            : "Unable to generate a response.",
      },
      { status: 502 }
    );
  }
}

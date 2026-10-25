
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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini is not configured. Add GEMINI_API_KEY to the server environment." },
        { status: 503 }
      );
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text:
                "You are Zohra, a helpful academic assistant. " +
                "Explain concepts clearly, use examples, and " +
                "help students understand rather than memorize.",
            }],
          },
          contents: validMessages.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 512,
          },
        }),
        signal: AbortSignal.timeout(120_000),
      }
    );

    if (!response.ok) {
      console.error("Gemini returned status:", response.status);

      const errorMessage =
        response.status === 400
          ? "Gemini rejected the request. Check that your API key is valid and enabled for the Gemini API."
          : response.status === 401 || response.status === 403
            ? "Gemini rejected the API key. Check GEMINI_API_KEY in your server environment."
            : response.status === 429
              ? "Gemini's rate limit or quota was reached. Check your Google AI Studio usage and try again."
              : "Gemini is unavailable right now. Please try again.";

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const data = await response.json();
    const reply = Array.isArray(data.candidates?.[0]?.content?.parts)
      ? data.candidates[0].content.parts
          .map((part: { text?: unknown }) =>
            typeof part.text === "string" ? part.text : ""
          )
          .join("")
          .trim()
      : "";

    if (!reply) {
      console.error(
        "Gemini returned no text. Finish reason:",
        data.candidates?.[0]?.finishReason ?? "unknown"
      );
      return NextResponse.json(
        { error: "Gemini returned an empty reply. Please try asking again." },
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

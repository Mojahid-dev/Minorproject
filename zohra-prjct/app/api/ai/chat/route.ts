
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

    const conversationInput = validMessages.map((message) => ({
      type: message.role === "assistant" ? "model_output" : "user_input",
      content: [{ type: "text", text: message.content }],
    }));
    const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    const requestModel = (model: string) =>
      fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          system_instruction:
            "You are Zohra, a helpful academic assistant. " +
            "Explain concepts clearly, use examples, and " +
            "help students understand rather than memorize.",
          input: conversationInput,
          generation_config: {
            temperature: 0.4,
            max_output_tokens: 512,
          },
        }),
        signal: AbortSignal.timeout(120_000),
      });
    let response: Response | undefined;

    for (const [index, model] of models.entries()) {
      response = await requestModel(model);

      if (index === 0 && response.status === 503) {
        console.warn(`Gemini ${model} returned 503; retrying once.`);
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        response = await requestModel(model);
      }

      const canTryFreeFallback =
        index === 0 && [429, 503].includes(response.status);
      if (response.ok || !canTryFreeFallback) break;

      console.warn(
        `Gemini ${model} returned ${response.status}; trying the free Flash-Lite fallback.`
      );
    }

    if (!response) {
      throw new Error("No Gemini model was requested.");
    }

    if (!response.ok) {
      const providerError = await response.json().catch(() => null);
      const providerMessage =
        typeof providerError?.error?.message === "string"
          ? providerError.error.message
          : "";
      console.error("Gemini request failed:", {
        status: response.status,
        message: providerMessage,
      });

      const errorMessage =
        response.status === 401 || response.status === 403
          ? "Gemini rejected the API key. Check GEMINI_API_KEY in your Vercel environment settings."
          : response.status === 404
            ? "Gemini could not find the requested model or API endpoint. Check the model access for your API key."
            : response.status === 429
              ? "Gemini's rate limit or quota was reached. Check your Google AI Studio usage and try again."
              : response.status >= 500
                ? `Google Gemini is temporarily unavailable (HTTP ${response.status}). Please try again shortly.`
                : providerMessage
                  ? `Gemini request failed: ${providerMessage}`
                  : `Gemini request failed (HTTP ${response.status}).`;

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const data = await response.json();
    const modelOutputSteps = Array.isArray(data.steps)
      ? data.steps.filter(
          (step: { type?: string }) => step.type === "model_output"
        )
      : [];
    const lastModelOutput = modelOutputSteps.at(-1);
    const reply = Array.isArray(lastModelOutput?.content)
      ? lastModelOutput.content
          .map((part: { type?: string; text?: unknown }) =>
            part.type === "text" && typeof part.text === "string"
              ? part.text
              : ""
          )
          .join("")
          .trim()
      : "";

    if (!reply) {
      console.error(
        "Gemini returned no text. Interaction status:",
        data.status ?? "unknown"
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

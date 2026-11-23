/**
 * Minimal Groq client for the OpenAI-compatible chat completions endpoint.
 *
 * It uses plain `fetch` on purpose: no SDK means no new dependency and nothing to change
 * in pnpm-lock.yaml, so Vercel installs keep working exactly as they do today.
 *
 * Server-only. Never import this from a client component (it reads GROQ_API_KEY).
 */

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GroqTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type GroqToolCall = {
  id: string;
  function: { name: string; arguments: string };
};

export type GroqChatOptions = {
  model: string;
  messages: GroqMessage[];
  tools?: GroqTool[];
  toolChoice?: "auto" | "required" | "none";
  temperature?: number;
  /** Reasoning models spend part of this on thinking, so keep it generous. */
  maxTokens?: number;
  timeoutMs: number;
  /** Aborts the call when the visitor leaves. */
  signal?: AbortSignal;
};

export type GroqChatResult = {
  model: string;
  content: string;
  toolCalls: GroqToolCall[];
  finishReason: string | null;
};

type GroqErrorKind = "http" | "timeout" | "network" | "aborted" | "bad-response";

export class GroqError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly kind: GroqErrorKind,
  ) {
    super(message);
    this.name = "GroqError";
  }

  /** True when a different Groq model might still work (rate limit, outage, retired model, slow reply). */
  get worthTryingAnotherModel() {
    if (this.kind === "timeout" || this.kind === "network") return true;
    if (this.kind !== "http" || this.status === null) return false;
    return this.status === 404 || this.status === 413 || this.status === 429 || this.status >= 500;
  }
}

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

type RawResponse = {
  choices?: {
    finish_reason?: string | null;
    message?: {
      content?: string | null;
      tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[];
    };
  }[];
};

export async function groqChat(options: GroqChatOptions): Promise<GroqChatResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new GroqError("GROQ_API_KEY is not set.", 401, "http");

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
    max_completion_tokens: options.maxTokens ?? 1024,
    stream: false,
  };

  if (options.tools?.length) {
    body.tools = options.tools;
    body.tool_choice = options.toolChoice ?? "auto";
  }

  // GPT-OSS models think before answering. Low effort keeps simple jobs fast, and the
  // reasoning text is not needed here, so it is not sent back.
  if (options.model.startsWith("openai/gpt-oss")) {
    body.reasoning_effort = "low";
    body.include_reasoning = false;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs);
  const onAbort = () => controller.abort();

  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      throw new GroqError(`Groq HTTP ${response.status}: ${detail}`, response.status, "http");
    }

    const data = (await response.json().catch(() => null)) as RawResponse | null;
    const choice = data?.choices?.[0];

    if (!choice?.message) {
      throw new GroqError("Groq returned no message.", response.status, "bad-response");
    }

    return {
      model: options.model,
      content: choice.message.content ?? "",
      toolCalls: (choice.message.tool_calls ?? []).flatMap((call, index) =>
        call.function?.name
          ? [
              {
                id: call.id ?? `call_${index}`,
                function: {
                  name: call.function.name,
                  arguments: call.function.arguments ?? "{}",
                },
              },
            ]
          : [],
      ),
      finishReason: choice.finish_reason ?? null,
    };
  } catch (error) {
    if (error instanceof GroqError) throw error;
    if (timedOut) throw new GroqError("Groq took too long to respond.", null, "timeout");
    if (options.signal?.aborted) throw new GroqError("Request was cancelled.", null, "aborted");
    throw new GroqError(
      error instanceof Error ? error.message : "Could not reach Groq.",
      null,
      "network",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

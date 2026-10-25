
"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage() {
    const content = input.trim();

    if (!content || loading) return;

    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content },
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Could not get an AI response."
        );
      }

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <div
            key={`${index}-${message.role}`}
            className={`rounded-xl p-4 ${
              message.role === "user"
                ? "ml-8 bg-neutral-900 text-white"
                : "mr-8 border bg-white text-neutral-900"
            }`}
          >
            <p className="mb-1 text-xs opacity-60">
              {message.role === "user" ? "You" : "Zohra AI"}
            </p>
            <p className="whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <input
          className="min-w-0 flex-1 rounded-xl border px-4 py-3"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Zohra anything..."
          maxLength={4000}
          disabled={loading}
        />

        <button
          className="rounded-xl bg-neutral-900 px-5 py-3 text-white disabled:opacity-50"
          type="submit"
          disabled={loading || !input.trim()}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>

      <p className="text-xs text-neutral-500">
        Powered by Google Gemini.
      </p>
    </section>
  );
}

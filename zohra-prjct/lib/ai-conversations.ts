export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export const MAX_CHAT_MESSAGE_LENGTH = 4_000;
export const MAX_CHAT_MESSAGES = 100;
export const MAX_CHAT_CONTEXT_MESSAGES = 24;
export const MAX_CHAT_TOTAL_LENGTH = 120_000;

export function parseChatMessages(value: unknown): ChatMessage[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_CHAT_MESSAGES
  ) {
    return null;
  }

  const messages: ChatMessage[] = [];
  let totalLength = 0;

  for (const message of value) {
    if (
      !message ||
      typeof message.content !== "string" ||
      !["user", "assistant"].includes(message.role) ||
      message.content.trim().length === 0 ||
      message.content.length > MAX_CHAT_MESSAGE_LENGTH
    ) {
      return null;
    }

    const content = message.content.trim();
    totalLength += content.length;
    if (totalLength > MAX_CHAT_TOTAL_LENGTH) return null;

    messages.push({
      role: message.role,
      content,
    });
  }

  return messages;
}

export function titleFromMessages(messages: ChatMessage[]) {
  const firstPrompt =
    messages.find((message) => message.role === "user")?.content ??
    "New conversation";
  const compactTitle = firstPrompt.replace(/\s+/g, " ").trim();
  return compactTitle.length > 117
    ? `${compactTitle.slice(0, 117).trimEnd()}...`
    : compactTitle;
}

export function toChatRole(role: "USER" | "ASSISTANT"): ChatRole {
  return role === "USER" ? "user" : "assistant";
}

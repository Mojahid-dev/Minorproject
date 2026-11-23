import type { ChatMessage } from "@/lib/ai-conversations";
import { MAX_TASKS_PER_CALL, runCreateTasks } from "@/lib/ai-task-tools";
import {
  groqChat,
  GroqError,
  isGroqConfigured,
  type GroqMessage,
  type GroqTool,
} from "@/lib/groq";
import { isDateOnly } from "@/lib/task-utils";

/**
 * Fast task creation with Groq.
 *
 * Gemini needs two model calls to add tasks (one to ask for the tool, one to write the
 * confirmation). Here Groq does it in ONE call: it returns the tasks plus a short
 * confirmation sentence, we save the tasks, and the answer is sent straight back.
 *
 * `tryCreateTasksWithGroq` returns null whenever it can't or shouldn't handle the message
 * (not a task request, no key, rate limit, timeout, unusable output). The chat route then
 * lets Gemini handle it exactly as before, so nothing gets worse.
 */

// Groq normally answers in well under a second. These only cap the bad days.
const ATTEMPT_TIMEOUT_MS = 4_000;
const TOTAL_BUDGET_MS = 6_000;
// Attached files are sent along, but very large ones are left to Gemini's bigger context.
const MAX_DOCUMENT_CHARS = 30_000;

const PRIMARY_MODEL = "openai/gpt-oss-20b";
const BACKUP_MODEL = "openai/gpt-oss-120b";

const TASK_WORDS =
  /\b(tasks?|to-?dos?|to do|reminders?|checklist|deadlines?|assignments?|study plan|revision plan|timetable|schedule)\b/i;
const ACTION_WORDS =
  /\b(add|create|make|set up|set|put|schedule|plan|remind|break|turn|convert|generate|list|save|bana\w*|karo|kar do|jodo|daal\w*)\b/i;

/** Cheap check so ordinary questions never wait on a Groq call. */
export function looksLikeTaskRequest(text: string) {
  return /\bremind me\b/i.test(text) || (TASK_WORDS.test(text) && ACTION_WORDS.test(text));
}

const groqCreateTasksTool: GroqTool = {
  type: "function",
  function: {
    name: "create_tasks",
    description:
      "Create tasks for the student. Call this only when the student explicitly asks to add, schedule, plan or break something into tasks. Never call it for ordinary questions.",
    parameters: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          description: `Between 1 and ${MAX_TASKS_PER_CALL} tasks.`,
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Short, action-oriented title, ideally under 100 characters.",
              },
              dueDate: {
                type: "string",
                description:
                  "Only when the student gave or clearly implied a date. Format YYYY-MM-DD, taken from the calendar in the instructions.",
              },
              notes: {
                type: "string",
                description: "Optional extra detail for the task.",
              },
            },
            required: ["title"],
          },
        },
        confirmation: {
          type: "string",
          description:
            "One short, friendly sentence confirming what was added, in the same language the student wrote in.",
        },
      },
      required: ["tasks"],
    },
  },
};

/** Lists the next two weeks with weekdays so "Friday" or "next Tuesday" resolve correctly. */
function upcomingDays(today: string, count = 14) {
  const base = new Date(`${today}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base);
    date.setUTCDate(base.getUTCDate() + index);
    return `${weekday.format(date)} ${date.toISOString().slice(0, 10)}${index === 0 ? " (today)" : ""}`;
  }).join(", ");
}

function buildSystemPrompt(today: string, documentPrompt: string) {
  const weekday = new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${today}T00:00:00Z`),
  );

  return [
    "You add tasks for a student in Zohra, a study workspace.",
    `Today is ${weekday}, ${today}. The next 14 days: ${upcomingDays(today)}.`,
    `If the student is asking you to add, schedule, plan or break something into tasks, call create_tasks ONCE with every task (maximum ${MAX_TASKS_PER_CALL}). If they are not asking for tasks, do not call the tool.`,
    "Keep titles short and action-oriented, in the language the student used. Put extra detail in notes.",
    "Set dueDate only when the student gave or clearly implied a date. Never invent dates. A date given without a year means its next occurrence on or after today. Use the calendar above for weekdays like Friday or next Tuesday.",
    "Do not repeat tasks. Use the student's earlier messages to understand words like 'those' or 'the first two'.",
    documentPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");
}

type CleanTask = { title: string; dueDate?: string; notes?: string };

/** Model output is untrusted: keep only what is valid, drop the rest instead of failing. */
function cleanTasks(value: unknown): CleanTask[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tasks: CleanTask[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { title, dueDate, notes } = item as Record<string, unknown>;
    if (typeof title !== "string") continue;

    const cleanTitle = title.replace(/\s+/g, " ").trim().slice(0, 180);
    if (!cleanTitle) continue;

    const task: CleanTask = { title: cleanTitle };
    if (isDateOnly(dueDate)) task.dueDate = dueDate;
    if (typeof notes === "string" && notes.trim()) task.notes = notes.trim().slice(0, 5000);

    const key = `${cleanTitle.toLowerCase()}|${task.dueDate ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    tasks.push(task);
    if (tasks.length === MAX_TASKS_PER_CALL) break;
  }

  return tasks;
}

function formatDue(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function plainText(value: string) {
  return value.replace(/[*_`#>]/g, "");
}

function buildReply(
  created: { title: string; dueDate: string | null }[],
  confirmation: unknown,
) {
  const intro =
    typeof confirmation === "string" && confirmation.trim()
      ? plainText(confirmation.replace(/\s+/g, " ").trim().slice(0, 240))
      : created.length === 1
        ? "Added 1 task to your list:"
        : `Added ${created.length} tasks to your list:`;

  const lines = created.map(
    (task) =>
      `- **${plainText(task.title)}**${task.dueDate ? ` (due ${formatDue(task.dueDate)})` : ""}`,
  );

  return `${intro}\n\n${lines.join("\n")}`;
}

export type GroqTaskOutcome = {
  created: { id: string; title: string; dueDate: string | null }[];
  reply: string;
  model: string;
  ms: number;
};

export async function tryCreateTasksWithGroq(input: {
  userId: string;
  /** The student's local date, YYYY-MM-DD. */
  today: string;
  userText: string;
  history: ChatMessage[];
  documentPrompt: string;
  signal?: AbortSignal;
}): Promise<GroqTaskOutcome | null> {
  if (!isGroqConfigured() || !looksLikeTaskRequest(input.userText)) return null;
  if (input.documentPrompt.length > MAX_DOCUMENT_CHARS) return null;

  const started = Date.now();
  const models = [
    ...new Set([
      process.env.GROQ_TASK_MODEL?.trim() || PRIMARY_MODEL,
      process.env.GROQ_TASK_FALLBACK_MODEL?.trim() || BACKUP_MODEL,
    ]),
  ];

  const recent: GroqMessage[] = input.history.slice(-6).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content.slice(0, 2_000),
  }));
  if (recent[0]?.role === "assistant") recent.shift();

  const messages: GroqMessage[] = [
    { role: "system", content: buildSystemPrompt(input.today, input.documentPrompt) },
    ...recent,
  ];

  for (const model of models) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
    if (remaining < 1_000) break;

    let result;

    try {
      result = await groqChat({
        model,
        messages,
        tools: [groqCreateTasksTool],
        toolChoice: "auto",
        temperature: 0.2,
        maxTokens: 1_500,
        timeoutMs: Math.min(remaining, ATTEMPT_TIMEOUT_MS),
        signal: input.signal,
      });
    } catch (error) {
      const known = error instanceof GroqError ? error : null;
      console.warn(
        `Groq task request failed on ${model}: ${known ? `${known.kind} ${known.status ?? ""}` : "unknown"}. ${
          known?.worthTryingAnotherModel ? "Trying the backup model." : "Using Gemini."
        }`,
      );
      if (known?.worthTryingAnotherModel) continue;
      return null;
    }

    const call = result.toolCalls.find((item) => item.function.name === "create_tasks");
    // No tool call means the model decided this is not a task request: let Gemini answer it.
    if (!call) return null;

    let args: unknown;
    try {
      args = JSON.parse(call.function.arguments);
    } catch {
      return null;
    }

    const record = args && typeof args === "object" ? (args as Record<string, unknown>) : {};
    const tasks = cleanTasks(record.tasks);
    if (tasks.length === 0) return null;

    // Same validation and database write the Gemini path uses.
    const outcome = await runCreateTasks(input.userId, { tasks });

    if (!("created" in outcome) || !Array.isArray(outcome.created) || outcome.created.length === 0) {
      return null;
    }

    const created = outcome.created.map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
    }));

    const ms = Date.now() - started;
    console.info(`Groq created ${created.length} task(s) with ${model} in ${ms}ms.`);

    return { created, reply: buildReply(created, record.confirmation), model, ms };
  }

  return null;
}

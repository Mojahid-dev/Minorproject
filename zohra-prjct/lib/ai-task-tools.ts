
import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { dateOnlyToDate, isDateOnly, serializeTask } from "@/lib/task-utils";

const MAX_TASKS_PER_CALL = 10;

const createTasksSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(180),
        dueDate: z.string().optional(),
        notes: z.string().trim().max(5000).optional(),
      }).strict(),
    )
    .min(1)
    .max(MAX_TASKS_PER_CALL),
}).strict();

export const createTasksDeclaration: FunctionDeclaration = {
  name: "create_tasks",
  description:
    "Create tasks for the authenticated student. Only call this when the student explicitly asks to add, schedule, or plan tasks. Never call for ordinary questions. Maximum 10 tasks per call. Do not invent dates.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      tasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "A clear action-oriented task title, maximum 180 characters.",
            },
            dueDate: {
              type: Type.STRING,
              description: "Optional valid date in YYYY-MM-DD format.",
            },
            notes: {
              type: Type.STRING,
              description: "Optional task details, maximum 5000 characters.",
            },
          },
          required: ["title"],
        },
      },
    },
    required: ["tasks"],
  },
};

/**
 * Creates tasks for the authenticated user.
 * Model arguments are untrusted and must always be validated.
 */
export async function runCreateTasks(
  userId: string,
  args: unknown,
) {
  if (!userId) {
    return { error: "Authentication is required to create tasks." };
  }

  const parsed = createTasksSchema.safeParse(args);

  if (!parsed.success) {
    return {
      error: "Invalid task data. Provide between 1 and 10 valid tasks.",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const data = [];

  for (const task of parsed.data.tasks) {
    let dueDate: Date | null = null;

    if (task.dueDate !== undefined) {
      if (!isDateOnly(task.dueDate)) {
        return {
          error: `Invalid due date for task "${task.title}". Use YYYY-MM-DD.`,
        };
      }

      dueDate = dateOnlyToDate(task.dueDate);
    }

    data.push({
      userId,
      title: task.title,
      notes: task.notes || null,
      dueDate,
    });
  }

  const created = await prisma.$transaction(
    data.map((task) => prisma.task.create({ data: task })),
  );

  return {
    success: true,
    count: created.length,
    created: created.map(serializeTask),
  };
}

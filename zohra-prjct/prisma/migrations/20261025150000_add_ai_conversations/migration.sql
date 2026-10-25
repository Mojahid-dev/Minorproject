CREATE TYPE "AIMessageRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "ai_conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_conversation_userId_updatedAt_idx"
    ON "ai_conversation"("userId", "updatedAt");

CREATE UNIQUE INDEX "ai_message_conversationId_position_key"
    ON "ai_message"("conversationId", "position");

ALTER TABLE "ai_conversation"
    ADD CONSTRAINT "ai_conversation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_message"
    ADD CONSTRAINT "ai_message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ai_conversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_preference"
    ADD COLUMN "pushTaskDue" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "pushExamSoon" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "pushAiFileReady" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "pushReminderHour" INTEGER NOT NULL DEFAULT 8;

CREATE TABLE "push_subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" VARCHAR(2048) NOT NULL,
    "p256dh" VARCHAR(255) NOT NULL,
    "auth" VARCHAR(255) NOT NULL,
    "timeZone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "userAgent" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscription_endpoint_key"
    ON "push_subscription"("endpoint");

CREATE INDEX "push_subscription_userId_idx"
    ON "push_subscription"("userId");

ALTER TABLE "push_subscription"
    ADD CONSTRAINT "push_subscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "key" VARCHAR(200) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_log_userId_type_key_key"
    ON "notification_log"("userId", "type", "key");

CREATE INDEX "notification_log_userId_type_sentAt_idx"
    ON "notification_log"("userId", "type", "sentAt");

ALTER TABLE "notification_log"
    ADD CONSTRAINT "notification_log_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "key" VARCHAR(200) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "body" VARCHAR(240) NOT NULL,
    "url" VARCHAR(300) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_userId_type_key_key"
    ON "notification"("userId", "type", "key");

CREATE INDEX "notification_userId_createdAt_idx"
    ON "notification"("userId", "createdAt");

CREATE INDEX "notification_userId_readAt_idx"
    ON "notification"("userId", "readAt");

ALTER TABLE "notification"
    ADD CONSTRAINT "notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

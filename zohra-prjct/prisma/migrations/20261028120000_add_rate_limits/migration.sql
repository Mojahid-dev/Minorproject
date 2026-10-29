CREATE TABLE "rate_limit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bucket" VARCHAR(80) NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rate_limit_userId_bucket_windowStart_key"
    ON "rate_limit"("userId", "bucket", "windowStart");

CREATE INDEX "rate_limit_windowStart_idx"
    ON "rate_limit"("windowStart");

ALTER TABLE "rate_limit"
    ADD CONSTRAINT "rate_limit_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "RecognitionStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'DECLINED',
    'REVOKED',
    'CANCELLED'
);

CREATE TABLE "recognition_request" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RecognitionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recognition_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recognition_request_userId_createdAt_idx"
    ON "recognition_request"("userId", "createdAt");
CREATE INDEX "recognition_request_status_createdAt_idx"
    ON "recognition_request"("status", "createdAt");
CREATE UNIQUE INDEX "recognition_request_one_pending_per_user_idx"
    ON "recognition_request"("userId")
    WHERE "status" = 'PENDING';

ALTER TABLE "recognition_request"
    ADD CONSTRAINT "recognition_request_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

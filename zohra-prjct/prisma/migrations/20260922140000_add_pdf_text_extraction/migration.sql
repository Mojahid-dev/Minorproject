-- CreateEnum
CREATE TYPE "TextExtractionStatus" AS ENUM ('NOT_STARTED', 'EXTRACTING', 'EXTRACTED', 'NO_TEXT', 'FAILED', 'NOT_APPLICABLE');

-- AlterTable
ALTER TABLE "resource"
ADD COLUMN "textExtractionStatus" "TextExtractionStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "extractedText" TEXT,
ADD COLUMN "extractedTextLength" INTEGER,
ADD COLUMN "pageCount" INTEGER,
ADD COLUMN "extractedAt" TIMESTAMP(3),
ADD COLUMN "extractionError" TEXT;

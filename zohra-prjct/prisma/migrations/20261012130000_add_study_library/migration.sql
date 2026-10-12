-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'PROCESSING', 'ORGANIZED', 'NEEDS_REVIEW', 'FAILED');

-- CreateTable
CREATE TABLE "study_year" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "study_year_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "semester" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studyYearId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "semester_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chapter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chapter_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Existing resources remain unassigned until the user confirms a location.
ALTER TABLE "resource"
    ADD COLUMN "organizationStatus" "OrganizationStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "organizationNote" VARCHAR(500),
    ADD COLUMN "studyYearId" TEXT,
    ADD COLUMN "semesterId" TEXT,
    ADD COLUMN "subjectId" TEXT,
    ADD COLUMN "chapterId" TEXT;

-- Mark previously completed uploads for user review; do not infer a folder for old files.
UPDATE "resource" SET "organizationStatus" = 'NEEDS_REVIEW' WHERE "status" = 'READY';

-- CreateIndex
CREATE UNIQUE INDEX "study_year_userId_label_key" ON "study_year"("userId", "label");
CREATE INDEX "study_year_userId_idx" ON "study_year"("userId");
CREATE UNIQUE INDEX "semester_studyYearId_name_key" ON "semester"("studyYearId", "name");
CREATE INDEX "semester_userId_idx" ON "semester"("userId");
CREATE UNIQUE INDEX "subject_semesterId_name_key" ON "subject"("semesterId", "name");
CREATE INDEX "subject_userId_idx" ON "subject"("userId");
CREATE UNIQUE INDEX "chapter_subjectId_name_key" ON "chapter"("subjectId", "name");
CREATE INDEX "chapter_userId_idx" ON "chapter"("userId");
CREATE INDEX "resource_userId_organizationStatus_idx" ON "resource"("userId", "organizationStatus");
CREATE INDEX "resource_userId_studyYearId_semesterId_subjectId_chapterId_idx" ON "resource"("userId", "studyYearId", "semesterId", "subjectId", "chapterId");

-- AddForeignKey
ALTER TABLE "study_year" ADD CONSTRAINT "study_year_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "semester" ADD CONSTRAINT "semester_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "semester" ADD CONSTRAINT "semester_studyYearId_fkey" FOREIGN KEY ("studyYearId") REFERENCES "study_year"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subject" ADD CONSTRAINT "subject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subject" ADD CONSTRAINT "subject_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resource" ADD CONSTRAINT "resource_studyYearId_fkey" FOREIGN KEY ("studyYearId") REFERENCES "study_year"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resource" ADD CONSTRAINT "resource_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resource" ADD CONSTRAINT "resource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resource" ADD CONSTRAINT "resource_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

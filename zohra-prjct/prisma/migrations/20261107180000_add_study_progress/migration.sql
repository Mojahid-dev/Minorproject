CREATE TYPE "StudySessionStatus" AS ENUM ('RUNNING', 'PAUSED', 'COMPLETED');
CREATE TYPE "StudySessionMode" AS ENUM ('STOPWATCH', 'POMODORO');

CREATE TABLE "study_session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subjectId" TEXT,
  "taskId" TEXT,
  "topic" VARCHAR(140),
  "mode" "StudySessionMode" NOT NULL DEFAULT 'STOPWATCH',
  "status" "StudySessionStatus" NOT NULL DEFAULT 'RUNNING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "segmentStartedAt" TIMESTAMP(3),
  "lastHeartbeatAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "accumulatedSeconds" INTEGER NOT NULL DEFAULT 0,
  "durationSeconds" INTEGER,
  "notes" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "study_session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "study_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "study_session_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "study_session_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "study_session_userId_startedAt_idx" ON "study_session"("userId", "startedAt");
CREATE INDEX "study_session_userId_status_idx" ON "study_session"("userId", "status");
CREATE INDEX "study_session_userId_status_endedAt_idx" ON "study_session"("userId", "status", "endedAt");
CREATE INDEX "study_session_subjectId_startedAt_idx" ON "study_session"("subjectId", "startedAt");
-- A student can have only one unfinished session, including a paused one.
CREATE UNIQUE INDEX "study_session_one_unfinished_per_user" ON "study_session"("userId") WHERE "status" IN ('RUNNING', 'PAUSED');

CREATE TABLE "study_goal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dailyTargetMinutes" INTEGER NOT NULL DEFAULT 120,
  "weeklyTargetMinutes" INTEGER NOT NULL DEFAULT 600,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "study_goal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "study_goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "study_goal_userId_key" ON "study_goal"("userId");

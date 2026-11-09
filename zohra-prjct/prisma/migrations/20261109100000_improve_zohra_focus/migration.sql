ALTER TYPE "StudySessionStatus" ADD VALUE IF NOT EXISTS 'ABANDONED';
ALTER TYPE "StudySessionMode" ADD VALUE IF NOT EXISTS 'COUNTDOWN';

CREATE TYPE "PomodoroPhase" AS ENUM ('FOCUS', 'SHORT_BREAK', 'LONG_BREAK');
CREATE TYPE "StudySessionEventType" AS ENUM ('PAUSE', 'RESUME', 'TAB_HIDDEN', 'TAB_VISIBLE', 'END', 'PHASE_CHANGED');
CREATE TYPE "StudySessionEndReason" AS ENUM ('DONE_EARLY', 'INTERRUPTED', 'GAVE_UP', 'TIMER_COMPLETED');

ALTER TABLE "study_session"
  ADD COLUMN "goal" VARCHAR(240),
  ADD COLUMN "plannedSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "endsAt" TIMESTAMP(3),
  ADD COLUMN "phaseStartedAt" TIMESTAMP(3),
  ADD COLUMN "pausedAt" TIMESTAMP(3),
  ADD COLUMN "pausedSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "awaySeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "focusSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "phaseAccumulatedSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "focusRating" INTEGER,
  ADD COLUMN "goalCompleted" BOOLEAN,
  ADD COLUMN "endReason" "StudySessionEndReason",
  ADD COLUMN "strictMode" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "focusMode" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pomodoroPhase" "PomodoroPhase",
  ADD COLUMN "currentCycle" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "focusDurationSeconds" INTEGER NOT NULL DEFAULT 1500,
  ADD COLUMN "shortBreakSeconds" INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN "longBreakSeconds" INTEGER NOT NULL DEFAULT 900;

CREATE TABLE "study_session_event" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "type" "StudySessionEventType" NOT NULL,
  "tabId" VARCHAR(80),
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "study_session_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "study_session_event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_session"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "study_session_event_sessionId_at_idx" ON "study_session_event"("sessionId", "at");
CREATE INDEX "study_session_event_sessionId_tabId_type_at_idx" ON "study_session_event"("sessionId", "tabId", "type", "at");

CREATE TABLE "parking_lot_note" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "text" VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "parking_lot_note_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "parking_lot_note_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_session"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "parking_lot_note_sessionId_createdAt_idx" ON "parking_lot_note"("sessionId", "createdAt");

-- Preserve pause state for sessions created before Focus Mode was introduced.
UPDATE "study_session" SET "pausedAt" = "updatedAt" WHERE "status" = 'PAUSED' AND "pausedAt" IS NULL;

-- The existing partial unique index already guarantees one RUNNING/PAUSED session per user.

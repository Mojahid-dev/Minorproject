ALTER TABLE "user" ADD COLUMN "introSeen" BOOLEAN NOT NULL DEFAULT false;

-- Existing accounts have already been using the app; show the intro only to accounts created after this migration.
UPDATE "user" SET "introSeen" = true;

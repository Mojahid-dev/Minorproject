-- Existing accounts should not be interrupted by the first-time tour.
-- New accounts receive version 0 and are eligible for the onboarding experience.
ALTER TABLE "user" ADD COLUMN "onboardingVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "user" ALTER COLUMN "onboardingVersion" SET DEFAULT 0;

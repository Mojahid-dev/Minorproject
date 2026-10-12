ALTER TABLE "resource"
    ADD COLUMN "awaitingOrganizationInput" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Existing uploads keep their current organization state. New uploads opt into
-- the post-upload tagging step when the resource record is created.

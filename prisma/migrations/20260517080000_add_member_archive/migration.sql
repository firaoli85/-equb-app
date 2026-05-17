-- Add archive fields to members
ALTER TABLE "members"
  ADD COLUMN "isArchived"     BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN "archivedAt"     TIMESTAMP(3),
  ADD COLUMN "archivedReason" TEXT;

-- Drop existing global unique indexes on wheel numbers
DROP INDEX IF EXISTS "members_wheelNumber_key";
DROP INDEX IF EXISTS "members_extraWheelNumber_key";

-- Recreate as partial unique indexes — only active (non-archived) members
-- must have unique wheel numbers.  Archived members may share numbers with
-- the replacement member that took their slot.
CREATE UNIQUE INDEX "members_wheelNumber_active_key"
  ON "members"("wheelNumber")
  WHERE "isArchived" = false;

CREATE UNIQUE INDEX "members_extraWheelNumber_active_key"
  ON "members"("extraWheelNumber")
  WHERE "isArchived" = false AND "extraWheelNumber" IS NOT NULL;

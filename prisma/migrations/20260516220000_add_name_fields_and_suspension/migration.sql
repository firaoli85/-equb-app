-- CreateEnum
CREATE TYPE "DisplayPreference" AS ENUM ('AMHARIC', 'ENGLISH');

-- AlterTable: rename name → nameAmharic, add new name fields, phone, wheelSuspended, displayPreference
ALTER TABLE "members"
  RENAME COLUMN "name" TO "nameAmharic";

ALTER TABLE "members"
  ADD COLUMN "nameEnglishFirst" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "nameEnglishLast"  TEXT NOT NULL DEFAULT '',
  ADD COLUMN "displayPreference" "DisplayPreference" NOT NULL DEFAULT 'AMHARIC',
  ADD COLUMN "phone"             TEXT,
  ADD COLUMN "wheelSuspended"    BOOLEAN NOT NULL DEFAULT false;

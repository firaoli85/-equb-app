-- CreateEnum
CREATE TYPE "WheelType" AS ENUM ('MAIN', 'EXTRA');

-- AlterTable
ALTER TABLE "week_payouts" ADD COLUMN     "memberId" TEXT,
ADD COLUMN     "wheelType" "WheelType" NOT NULL DEFAULT 'MAIN';

-- CreateIndex
CREATE INDEX "week_payouts_memberId_idx" ON "week_payouts"("memberId");

-- AddForeignKey
ALTER TABLE "week_payouts" ADD CONSTRAINT "week_payouts_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

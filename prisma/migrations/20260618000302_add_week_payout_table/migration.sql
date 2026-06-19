-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('CASH', 'ZELLE', 'BOTH', 'CASHAPP', 'VENMO', 'BANK', 'OTHER');

-- CreateTable
CREATE TABLE "week_payouts" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(12,2),
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PayoutMethod",
    "notes" TEXT,
    "collectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "week_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "week_payouts_weekId_idx" ON "week_payouts"("weekId");

-- CreateIndex
CREATE INDEX "week_payouts_status_idx" ON "week_payouts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "week_payouts_weekId_number_key" ON "week_payouts"("weekId", "number");

-- AddForeignKey
ALTER TABLE "week_payouts" ADD CONSTRAINT "week_payouts_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

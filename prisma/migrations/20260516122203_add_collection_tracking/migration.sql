-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'COLLECTED');

-- CreateEnum
CREATE TYPE "CollectionMethod" AS ENUM ('CASH', 'ZELLE', 'BOTH');

-- AlterTable
ALTER TABLE "weeks" ADD COLUMN     "payoutMethod" "CollectionMethod",
ADD COLUMN     "payoutNotes" TEXT,
ADD COLUMN     "payoutStatus" "PayoutStatus",
ADD COLUMN     "winnerWheelNumber" INTEGER;

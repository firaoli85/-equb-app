-- AlterTable
ALTER TABLE "weeks" ADD COLUMN     "winnerNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

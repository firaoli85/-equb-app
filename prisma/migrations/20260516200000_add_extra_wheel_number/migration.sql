-- AlterTable
ALTER TABLE "members" ADD COLUMN "extraWheelNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "members_extraWheelNumber_key" ON "members"("extraWheelNumber");

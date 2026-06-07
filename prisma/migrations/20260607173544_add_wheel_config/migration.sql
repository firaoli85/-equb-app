-- CreateTable
CREATE TABLE "wheel_slots" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "numbers" INTEGER[],

    CONSTRAINT "wheel_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wheel_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "priorityNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "wheel_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wheel_slots_position_key" ON "wheel_slots"("position");

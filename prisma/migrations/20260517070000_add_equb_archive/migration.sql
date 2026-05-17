CREATE TABLE "equb_archives" (
    "id"          TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "startDate"   TIMESTAMP(3) NOT NULL,
    "endDate"     TIMESTAMP(3) NOT NULL,
    "archivedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot"    JSONB NOT NULL,

    CONSTRAINT "equb_archives_pkey" PRIMARY KEY ("id")
);

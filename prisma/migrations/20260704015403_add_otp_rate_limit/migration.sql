-- CreateTable
CREATE TABLE "otp_rate_limits" (
    "phone" TEXT NOT NULL,
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSentAt" TIMESTAMP(3),
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "failWindowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_rate_limits_pkey" PRIMARY KEY ("phone")
);

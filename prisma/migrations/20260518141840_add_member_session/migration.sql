-- AlterTable
ALTER TABLE "members" ALTER COLUMN "collectionConfirmedAtExtra" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "member_sessions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_sessions_sessionToken_key" ON "member_sessions"("sessionToken");

-- AddForeignKey
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

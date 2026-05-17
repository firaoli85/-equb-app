-- Add OTP fields to members
ALTER TABLE "members"
  ADD COLUMN "otpCode" TEXT,
  ADD COLUMN "otpExpiresAt" TIMESTAMP(3);

-- ReviewStatus enum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- PaymentReviewRequest table
CREATE TABLE "payment_review_requests" (
  "id"            TEXT        NOT NULL,
  "memberId"      TEXT        NOT NULL,
  "weekId"        TEXT        NOT NULL,
  "claimedStatus" TEXT        NOT NULL,
  "claimedDate"   TIMESTAMP(3) NOT NULL,
  "notes"         TEXT,
  "adminNote"     TEXT,
  "status"        "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_review_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payment_review_requests"
  ADD CONSTRAINT "payment_review_requests_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_review_requests"
  ADD CONSTRAINT "payment_review_requests_weekId_fkey"
  FOREIGN KEY ("weekId") REFERENCES "weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

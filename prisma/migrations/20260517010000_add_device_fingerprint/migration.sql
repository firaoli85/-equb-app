ALTER TABLE "members"
  ADD COLUMN "confirmedFingerprint"              JSONB,
  ADD COLUMN "collectionConfirmedFingerprint"    JSONB,
  ADD COLUMN "collectionConfirmedFingerprintExtra" JSONB;

-- Finisher for partial 20260521060000 migration: drop leftover unique index,
-- add new (courtId, kind, ipHash) unique, add kind index.

DROP INDEX IF EXISTS "court_flags_courtId_ipHash_key";

CREATE UNIQUE INDEX "court_flags_courtId_kind_ipHash_key"
  ON "court_flags"("courtId", "kind", "ipHash");

CREATE INDEX IF NOT EXISTS "court_flags_kind_idx" ON "court_flags"("kind");

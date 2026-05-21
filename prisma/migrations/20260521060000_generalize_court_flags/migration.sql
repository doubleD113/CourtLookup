-- Add hiddenAt to courts (soft-hide for venues confirmed to have no court)
ALTER TABLE "courts" ADD COLUMN "hiddenAt" TIMESTAMP(3);
CREATE INDEX "courts_hiddenAt_idx" ON "courts"("hiddenAt");

-- Generalize court_flags: kind + payload (jsonb), drop suggestedSurface
ALTER TABLE "court_flags" ADD COLUMN "kind" TEXT;
ALTER TABLE "court_flags" ADD COLUMN "payload" JSONB;

-- Backfill existing rows as kind='surface', payload={surface: <old value>}
UPDATE "court_flags"
SET "kind" = 'surface',
    "payload" = jsonb_build_object('surface', "suggestedSurface")
WHERE "kind" IS NULL;

ALTER TABLE "court_flags" ALTER COLUMN "kind" SET NOT NULL;
ALTER TABLE "court_flags" ALTER COLUMN "payload" SET NOT NULL;
ALTER TABLE "court_flags" DROP COLUMN "suggestedSurface";

-- Replace old unique (courtId, ipHash) with (courtId, kind, ipHash)
ALTER TABLE "court_flags" DROP CONSTRAINT "court_flags_courtId_ipHash_key";
ALTER TABLE "court_flags" ADD CONSTRAINT "court_flags_courtId_kind_ipHash_key" UNIQUE ("courtId", "kind", "ipHash");

CREATE INDEX "court_flags_kind_idx" ON "court_flags"("kind");

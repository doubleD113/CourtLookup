-- Replace boolean `indoor` with string `surface` ('indoor' | 'outdoor' | 'both')

ALTER TABLE "courts" ADD COLUMN "surface" TEXT NOT NULL DEFAULT 'indoor';

UPDATE "courts" SET "surface" = CASE WHEN "indoor" THEN 'indoor' ELSE 'outdoor' END;

ALTER TABLE "courts" DROP COLUMN "indoor";

-- CreateTable
CREATE TABLE "courts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "facilityType" TEXT NOT NULL,
    "indoor" BOOLEAN NOT NULL DEFAULT true,
    "courtCount" INTEGER,
    "bookingUrl" TEXT,
    "websiteUrl" TEXT,
    "phone" TEXT,
    "openingHours" JSONB,
    "googlePlaceId" TEXT,
    "source" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courts_googlePlaceId_key" ON "courts"("googlePlaceId");

-- CreateIndex
CREATE INDEX "courts_suburb_idx" ON "courts"("suburb");

-- CreateIndex
CREATE INDEX "courts_postcode_idx" ON "courts"("postcode");

-- CreateIndex
CREATE INDEX "courts_state_idx" ON "courts"("state");

-- CreateTable
CREATE TABLE "url_health" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "errorMsg" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "url_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "url_health_courtId_key" ON "url_health"("courtId");

-- CreateIndex
CREATE INDEX "url_health_status_idx" ON "url_health"("status");

-- AddForeignKey
ALTER TABLE "url_health" ADD CONSTRAINT "url_health_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

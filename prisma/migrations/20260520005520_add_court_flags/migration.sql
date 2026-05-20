-- CreateTable
CREATE TABLE "court_flags" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "suggestedSurface" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "court_flags_courtId_idx" ON "court_flags"("courtId");

-- CreateIndex
CREATE UNIQUE INDEX "court_flags_courtId_ipHash_key" ON "court_flags"("courtId", "ipHash");

-- AddForeignKey
ALTER TABLE "court_flags" ADD CONSTRAINT "court_flags_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

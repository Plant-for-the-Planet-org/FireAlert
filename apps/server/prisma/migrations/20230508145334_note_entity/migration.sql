-- CreateTable
CREATE TABLE "VerificationTracking" (
    "id" TEXT NOT NULL,
    "alertMethodId" TEXT NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "VerificationTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationTracking_alertMethodId_key" ON "VerificationTracking"("alertMethodId");

-- AddForeignKey
ALTER TABLE "VerificationTracking" ADD CONSTRAINT "VerificationTracking_alertMethodId_fkey" FOREIGN KEY ("alertMethodId") REFERENCES "AlertMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

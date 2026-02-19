-- AlterTable
ALTER TABLE "SiteAlert" ADD COLUMN     "siteIncidentId" TEXT;

-- CreateTable
CREATE TABLE "SiteIncident" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "startSiteAlertId" TEXT NOT NULL,
    "endSiteAlertId" TEXT,
    "latestSiteAlertId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "startNotificationId" TEXT,
    "endNotificationId" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'to_review',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteIncident_siteId_idx" ON "SiteIncident"("siteId");

-- CreateIndex
CREATE INDEX "SiteIncident_isActive_isProcessed_idx" ON "SiteIncident"("isActive", "isProcessed");

-- CreateIndex
CREATE INDEX "SiteIncident_startedAt_idx" ON "SiteIncident"("startedAt");

-- CreateIndex
CREATE INDEX "SiteAlert_siteIncidentId_idx" ON "SiteAlert"("siteIncidentId");

-- AddForeignKey
ALTER TABLE "SiteIncident" ADD CONSTRAINT "SiteIncident_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteIncident" ADD CONSTRAINT "SiteIncident_startSiteAlertId_fkey" FOREIGN KEY ("startSiteAlertId") REFERENCES "SiteAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteIncident" ADD CONSTRAINT "SiteIncident_latestSiteAlertId_fkey" FOREIGN KEY ("latestSiteAlertId") REFERENCES "SiteAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteIncident" ADD CONSTRAINT "SiteIncident_endSiteAlertId_fkey" FOREIGN KEY ("endSiteAlertId") REFERENCES "SiteAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteAlert" ADD CONSTRAINT "SiteAlert_siteIncidentId_fkey" FOREIGN KEY ("siteIncidentId") REFERENCES "SiteIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

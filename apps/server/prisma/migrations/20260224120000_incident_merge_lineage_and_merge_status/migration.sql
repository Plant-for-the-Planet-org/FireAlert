-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'MERGE_SCHEDULED';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'MERGE_SENT';

-- AlterTable
ALTER TABLE "SiteIncident"
ADD COLUMN "mergedIncidentId" TEXT,
ADD COLUMN "mergedAt" TIMESTAMP(3),
ADD COLUMN "isMergedIncident" BOOLEAN NOT NULL DEFAULT false;

-- AddConstraint
ALTER TABLE "SiteIncident"
ADD CONSTRAINT "SiteIncident_mergedIncidentId_not_self_check"
CHECK ("mergedIncidentId" IS NULL OR "mergedIncidentId" <> "id");

-- AddForeignKey
ALTER TABLE "SiteIncident"
ADD CONSTRAINT "SiteIncident_mergedIncidentId_fkey"
FOREIGN KEY ("mergedIncidentId") REFERENCES "SiteIncident"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "SiteIncident_siteId_isActive_idx" ON "SiteIncident"("siteId", "isActive");
CREATE INDEX "SiteIncident_mergedIncidentId_isActive_idx" ON "SiteIncident"("mergedIncidentId", "isActive");
CREATE INDEX "SiteIncident_siteId_isActive_isMergedIncident_idx" ON "SiteIncident"("siteId", "isActive", "isMergedIncident");

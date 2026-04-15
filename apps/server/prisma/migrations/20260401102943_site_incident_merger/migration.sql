-- AlterTable
ALTER TABLE "SiteIncident" ADD COLUMN     "relatedIncidentId" TEXT;

-- CreateIndex
CREATE INDEX "SiteIncident_relatedIncidentId_idx" ON "SiteIncident"("relatedIncidentId");

-- AddForeignKey
ALTER TABLE "SiteIncident" ADD CONSTRAINT "SiteIncident_relatedIncidentId_fkey" FOREIGN KEY ("relatedIncidentId") REFERENCES "SiteIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

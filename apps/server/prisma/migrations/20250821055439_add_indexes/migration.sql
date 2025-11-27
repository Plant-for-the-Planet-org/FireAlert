-- CreateIndex
CREATE INDEX "AlertMethod_userId_idx" ON "AlertMethod"("userId");

-- CreateIndex
CREATE INDEX "Site_userId_idx" ON "Site"("userId");

-- CreateIndex
CREATE INDEX "Site_detectionGeometry_idx" ON "Site" USING GIST ("detectionGeometry");

-- CreateIndex
CREATE INDEX "SiteAlert_isProcessed_eventDate_idx" ON "SiteAlert"("isProcessed", "eventDate");

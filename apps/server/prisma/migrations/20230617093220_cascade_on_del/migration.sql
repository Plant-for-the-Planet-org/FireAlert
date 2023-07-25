-- DropForeignKey
ALTER TABLE "AlertMethod" DROP CONSTRAINT "AlertMethod_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_siteAlertId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";

-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_userId_fkey";

-- DropForeignKey
ALTER TABLE "SiteAlert" DROP CONSTRAINT "SiteAlert_siteId_fkey";

-- DropForeignKey
ALTER TABLE "VerificationRequest" DROP CONSTRAINT "VerificationRequest_alertMethodId_fkey";

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_alertMethodId_fkey" FOREIGN KEY ("alertMethodId") REFERENCES "AlertMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertMethod" ADD CONSTRAINT "AlertMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteAlert" ADD CONSTRAINT "SiteAlert_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_siteAlertId_fkey" FOREIGN KEY ("siteAlertId") REFERENCES "SiteAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

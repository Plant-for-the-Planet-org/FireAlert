/*
  Warnings:

  - You are about to drop the `Alert` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AlertProvider` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventAreas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_siteId_fkey";

-- DropTable
DROP TABLE "Alert";

-- DropTable
DROP TABLE "AlertProvider";

-- DropTable
DROP TABLE "EventAreas";

-- CreateTable
CREATE TABLE "GeoEventProvider" (
    "id" TEXT NOT NULL,
    "slug" "AlertProviderSlug" NOT NULL,
    "type" "AlertType" NOT NULL,
    "source" TEXT NOT NULL,
    "config" JSONB,

    CONSTRAINT "GeoEventProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteAlert" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "detectedBy" "AlertDetectedBy" NOT NULL,
    "confidence" "AlertConfidence" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "frp" DOUBLE PRECISION NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "outside" DOUBLE PRECISION,
    "siteId" TEXT NOT NULL,

    CONSTRAINT "SiteAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoEvent" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" "AlertConfidence" NOT NULL,
    "detectedBy" "AlertDetectedBy" NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "radius" INTEGER,
    "source" "EventAreasSource" NOT NULL,

    CONSTRAINT "GeoEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteDetection" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "detectionGeometry" TEXT NOT NULL,

    CONSTRAINT "SiteDetection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SiteAlert" ADD CONSTRAINT "SiteAlert_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteDetection" ADD CONSTRAINT "SiteDetection_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

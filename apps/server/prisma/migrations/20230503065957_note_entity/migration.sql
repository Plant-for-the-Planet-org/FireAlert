/*
  Warnings:

  - Made the column `guid` on table `Alert` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `Alert` required. This step will fail if there are existing NULL values in that column.
  - Made the column `eventDate` on table `Alert` required. This step will fail if there are existing NULL values in that column.
  - Made the column `detectedBy` on table `Alert` required. This step will fail if there are existing NULL values in that column.
  - Made the column `confidence` on table `Alert` required. This step will fail if there are existing NULL values in that column.
  - Made the column `latitude` on table `Alert` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `Alert` required. This step will fail if there are existing NULL values in that column.
  - Made the column `frp` on table `Alert` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isRead` on table `Alert` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Alert" ALTER COLUMN "guid" SET NOT NULL,
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "eventDate" SET NOT NULL,
ALTER COLUMN "eventDate" SET DATA TYPE TEXT,
ALTER COLUMN "detectedBy" SET NOT NULL,
ALTER COLUMN "confidence" SET NOT NULL,
ALTER COLUMN "confidence" SET DATA TYPE TEXT,
ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL,
ALTER COLUMN "frp" SET NOT NULL,
ALTER COLUMN "isRead" SET NOT NULL,
ALTER COLUMN "isRead" SET DEFAULT false;

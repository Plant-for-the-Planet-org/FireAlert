/*
  Warnings:

  - The `reviewStatus` column on the `SiteIncident` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SiteIncidentReviewStatus" AS ENUM ('TO_REVIEW', 'STOP_ALERTS');

-- AlterTable
ALTER TABLE "SiteIncident" DROP COLUMN "reviewStatus",
ADD COLUMN     "reviewStatus" "SiteIncidentReviewStatus" NOT NULL DEFAULT 'TO_REVIEW';

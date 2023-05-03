/*
  Warnings:

  - Added the required column `detectionCoordinates` to the `Site` table without a default value. This is not possible if the table is not empty.
  - Made the column `type` on table `Site` required. This step will fail if there are existing NULL values in that column.
  - Made the column `geometry` on table `Site` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isMonitored` on table `Site` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "detectionCoordinates" JSONB NOT NULL,
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "geometry" SET NOT NULL,
ALTER COLUMN "isMonitored" SET NOT NULL;

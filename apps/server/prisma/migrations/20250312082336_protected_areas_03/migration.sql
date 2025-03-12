/*
  Warnings:

  - You are about to drop the column `externalId` on the `Site` table. All the data in the column will be lost.
  - The `origin` column on the `Site` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SiteOrigin" AS ENUM ('firealert', 'ttc', 'protectedplanet');

-- AlterTable
ALTER TABLE "Site" DROP COLUMN "externalId",
DROP COLUMN "origin",
ADD COLUMN     "origin" "SiteOrigin" NOT NULL DEFAULT 'firealert';

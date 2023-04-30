/*
  Warnings:

  - The `type` column on the `Site` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `radius` column on the `Site` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Example` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('Point', 'Polygon', 'MultiPolygon');

-- CreateEnum
CREATE TYPE "SiteRadius" AS ENUM ('inside', 'within5km', 'within10km', 'within100km');

-- AlterTable
ALTER TABLE "Site" DROP COLUMN "type",
ADD COLUMN     "type" "SiteType",
DROP COLUMN "radius",
ADD COLUMN     "radius" "SiteRadius" DEFAULT 'inside';

-- DropTable
DROP TABLE "Example";

/*
  Warnings:

  - The `radius` column on the `Site` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Site" DROP COLUMN "radius",
ADD COLUMN     "radius" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "SiteRadius";

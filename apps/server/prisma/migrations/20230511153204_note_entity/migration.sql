/*
  Warnings:

  - You are about to drop the column `guid` on the `Site` table. All the data in the column will be lost.
  - You are about to drop the column `guid` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Site_guid_key";

-- DropIndex
DROP INDEX "User_guid_key";

-- AlterTable
ALTER TABLE "Site" DROP COLUMN "guid";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "guid";

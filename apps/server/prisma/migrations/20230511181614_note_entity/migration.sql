/*
  Warnings:

  - You are about to drop the column `guid` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `guid` on the `AlertMethod` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Alert_guid_key";

-- DropIndex
DROP INDEX "AlertMethod_guid_key";

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "guid";

-- AlterTable
ALTER TABLE "AlertMethod" DROP COLUMN "guid";

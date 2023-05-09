/*
  Warnings:

  - You are about to drop the `VerificationTracking` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VerificationTracking" DROP CONSTRAINT "VerificationTracking_alertMethodId_fkey";

-- AlterTable
ALTER TABLE "AlertMethod" ADD COLUMN     "lastTokenSentDate" TIMESTAMP(3),
ADD COLUMN     "tokenSentCount" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "VerificationTracking";

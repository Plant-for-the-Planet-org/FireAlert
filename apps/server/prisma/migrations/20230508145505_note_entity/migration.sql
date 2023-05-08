/*
  Warnings:

  - Added the required column `attemptCount` to the `VerificationTracking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VerificationTracking" ADD COLUMN     "attemptCount" INTEGER NOT NULL;

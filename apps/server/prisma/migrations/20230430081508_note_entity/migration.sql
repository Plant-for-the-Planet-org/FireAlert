/*
  Warnings:

  - The `deviceType` column on the `AlertMethod` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `guid` on table `AlertMethod` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `method` to the `AlertMethod` table without a default value. This is not possible if the table is not empty.
  - Made the column `destination` on table `AlertMethod` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isVerified` on table `AlertMethod` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isEnabled` on table `AlertMethod` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AlertMethodMethod" AS ENUM ('email', 'sms', 'device');

-- CreateEnum
CREATE TYPE "AlertMethodDeviceType" AS ENUM ('ios', 'android');

-- AlterTable
ALTER TABLE "AlertMethod" ALTER COLUMN "guid" SET NOT NULL,
DROP COLUMN "method",
ADD COLUMN     "method" "AlertMethodMethod" NOT NULL,
ALTER COLUMN "destination" SET NOT NULL,
ALTER COLUMN "isVerified" SET NOT NULL,
ALTER COLUMN "isVerified" SET DEFAULT false,
ALTER COLUMN "isEnabled" SET NOT NULL,
ALTER COLUMN "isEnabled" SET DEFAULT false,
DROP COLUMN "deviceType",
ADD COLUMN     "deviceType" "AlertMethodDeviceType";

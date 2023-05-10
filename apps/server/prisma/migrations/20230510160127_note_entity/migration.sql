/*
  Warnings:

  - You are about to drop the `WorldFireAlert` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `type` on the `Alert` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `AlertProvider` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('fire');

-- CreateEnum
CREATE TYPE "EventAreasSource" AS ENUM ('FIRMS');

-- AlterEnum
ALTER TYPE "AlertMethodMethod" ADD VALUE 'whatsapp';

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "type",
ADD COLUMN     "type" "AlertType" NOT NULL;

-- AlterTable
ALTER TABLE "AlertProvider" DROP COLUMN "type",
ADD COLUMN     "type" "AlertType" NOT NULL;

-- DropTable
DROP TABLE "WorldFireAlert";

-- DropEnum
DROP TYPE "AlertProviderType";

-- CreateTable
CREATE TABLE "EventAreas" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" "AlertConfidence" NOT NULL,
    "detectedBy" "AlertDetectedBy" NOT NULL,
    "frp" DOUBLE PRECISION NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "radius" INTEGER,
    "source" "EventAreasSource" NOT NULL,

    CONSTRAINT "EventAreas_pkey" PRIMARY KEY ("id")
);

/*
  Warnings:

  - Changed the type of `eventDate` on the `Alert` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "eventDate",
ADD COLUMN     "eventDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "WorldFireAlert" ADD COLUMN     "isChecked" BOOLEAN NOT NULL DEFAULT false;

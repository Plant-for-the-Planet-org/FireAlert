-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "falseAlertTime" TIMESTAMP(3),
ADD COLUMN     "isFrozen" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SiteAlert" ADD COLUMN     "falsePositive" TIMESTAMP(3);


-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Site" ALTER COLUMN "detectionArea" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "isSkipped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB;

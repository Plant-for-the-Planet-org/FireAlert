-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('START_SCHEDULED', 'START_SENT', 'END_SCHEDULED', 'END_SENT');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "notificationStatus" "NotificationStatus";

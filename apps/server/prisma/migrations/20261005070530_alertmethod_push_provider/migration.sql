-- CreateEnum
CREATE TYPE "PushProvider" AS ENUM ('ONESIGNAL', 'FCM');

-- AlterTable
ALTER TABLE "AlertMethod" ADD COLUMN     "pushProvider" "PushProvider";

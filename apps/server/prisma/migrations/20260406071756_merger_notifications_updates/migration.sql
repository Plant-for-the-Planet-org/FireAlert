-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationStatus" ADD VALUE 'MERGE_START_SCHEDULED';
ALTER TYPE "NotificationStatus" ADD VALUE 'MERGE_START_SENT';
ALTER TYPE "NotificationStatus" ADD VALUE 'MERGE_END_SCHEDULED';
ALTER TYPE "NotificationStatus" ADD VALUE 'MERGE_END_SENT';

-- Add plan column on User table
ALTER TABLE "User"
ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'basic';

-- Add detectionArea column in Site table
ALTER TABLE "Site"
ADD COLUMN "detectionArea" DOUBLE PRECISION DEFAULT 0;
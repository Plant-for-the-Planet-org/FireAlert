-- Step 1: Add the "userId" column to the "GeoEventProvider" table
ALTER TABLE "GeoEventProvider"
ADD COLUMN "userId" TEXT;

ALTER TABLE "User"
ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'basic';

-- AddForeignKey
ALTER TABLE "GeoEventProvider" ADD CONSTRAINT "GeoEventProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
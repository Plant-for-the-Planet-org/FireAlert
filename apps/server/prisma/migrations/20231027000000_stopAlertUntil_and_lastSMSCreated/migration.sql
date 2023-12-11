-- Add stopAlertUntil field to Site table
ALTER TABLE "Site" 
ADD COLUMN "stopAlertUntil" TIMESTAMP(3);

-- Add lastMessageCreated field to Site table
ALTER TABLE "Site" 
ADD COLUMN "lastMessageCreated" TIMESTAMP(3);

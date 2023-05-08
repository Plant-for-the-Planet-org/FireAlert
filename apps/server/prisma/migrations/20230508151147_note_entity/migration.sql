/*
  Warnings:

  - A unique constraint covering the columns `[destination,userId]` on the table `AlertMethod` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AlertMethod_destination_key";

-- CreateIndex
CREATE UNIQUE INDEX "AlertMethod_destination_userId_key" ON "AlertMethod"("destination", "userId");

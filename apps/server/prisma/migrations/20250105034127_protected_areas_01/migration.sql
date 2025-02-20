-- CreateEnum
CREATE TYPE "SiteKind" AS ENUM ('USER_SITE', 'PROTECTED_SITE');

-- CreateEnum
CREATE TYPE "SiteRelationRole" AS ENUM ('ROLE_ADMIN', 'ROLE_VIEWER');

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "kind" "SiteKind" DEFAULT 'USER_SITE',
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SiteRelation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SiteRelationRole" NOT NULL DEFAULT 'ROLE_ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SiteRelation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SiteRelation" ADD CONSTRAINT "SiteRelation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteRelation" ADD CONSTRAINT "SiteRelation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

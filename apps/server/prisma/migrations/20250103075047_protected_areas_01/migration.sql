-- CreateEnum
CREATE TYPE "SiteKind" AS ENUM ('USER_SITE', 'PROTECTED_SITE');

-- CreateEnum
CREATE TYPE "UserSiteRelationRole" AS ENUM ('ROLE_ADMIN', 'ROLE_VIEWER');

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "kind" "SiteKind" DEFAULT 'USER_SITE',
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UserSiteRelation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserSiteRelationRole" NOT NULL DEFAULT 'ROLE_ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserSiteRelation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserSiteRelation" ADD CONSTRAINT "UserSiteRelation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSiteRelation" ADD CONSTRAINT "UserSiteRelation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

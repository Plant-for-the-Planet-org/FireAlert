-- CreateEnum
CREATE TYPE "SiteKind" AS ENUM ('USER_SITE', 'PROTECTED_SITE');

-- CreateEnum
CREATE TYPE "SiteRelationRole" AS ENUM ('ROLE_ADMIN', 'ROLE_VIEWER');

-- AlterTable
ALTER TABLE "Site" ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "detectionArea" DROP DEFAULT;

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

-- CreateTable
CREATE TABLE "protectedarea" (
    "gid" SERIAL NOT NULL,
    "wdpaid" DECIMAL,
    "wdpa_pid" VARCHAR(52),
    "pa_def" VARCHAR(20),
    "name" VARCHAR(254),
    "orig_name" VARCHAR(254),
    "desig" VARCHAR(254),
    "desig_eng" VARCHAR(254),
    "desig_type" VARCHAR(20),
    "iucn_cat" VARCHAR(20),
    "int_crit" VARCHAR(100),
    "marine" VARCHAR(20),
    "rep_m_area" DECIMAL,
    "gis_m_area" DECIMAL,
    "rep_area" DECIMAL,
    "gis_area" DECIMAL,
    "no_take" VARCHAR(50),
    "no_tk_area" DECIMAL,
    "status" VARCHAR(100),
    "status_yr" INTEGER,
    "gov_type" VARCHAR(254),
    "own_type" VARCHAR(254),
    "mang_auth" VARCHAR(254),
    "mang_plan" VARCHAR(254),
    "verif" VARCHAR(20),
    "metadataid" INTEGER,
    "sub_loc" VARCHAR(100),
    "parent_iso" VARCHAR(50),
    "iso3" VARCHAR(50),
    "supp_info" VARCHAR(254),
    "cons_obj" VARCHAR(100),
    "geom" geometry,

    CONSTRAINT "protectedarea_pkey" PRIMARY KEY ("gid")
);

-- CreateIndex
CREATE INDEX "protectedarea_geom_idx" ON "protectedarea" USING GIST ("geom");

-- CreateIndex
CREATE INDEX "protectedarea_geom_idx1" ON "protectedarea" USING GIST ("geom");

-- AddForeignKey
ALTER TABLE "SiteRelation" ADD CONSTRAINT "SiteRelation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteRelation" ADD CONSTRAINT "SiteRelation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

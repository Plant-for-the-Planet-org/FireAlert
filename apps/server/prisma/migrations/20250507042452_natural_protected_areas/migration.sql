-- CreateEnum
CREATE TYPE "SiteRelationRole" AS ENUM ('ROLE_ADMIN', 'ROLE_VIEWER');

-- AlterTable
ALTER TABLE "Site" ALTER COLUMN "userId" DROP NOT NULL;

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
CREATE TABLE "ProtectedArea" (
    "gid" SERIAL NOT NULL,
    "WDPAID" DECIMAL(65,30),
    "WDPA_PID" VARCHAR(52),
    "PA_DEF" VARCHAR(20),
    "NAME" VARCHAR(254),
    "ORIG_NAME" VARCHAR(254),
    "DESIG" VARCHAR(254),
    "DESIG_ENG" VARCHAR(254),
    "DESIG_TYPE" VARCHAR(20),
    "IUCN_CAT" VARCHAR(20),
    "INT_CRIT" VARCHAR(100),
    "MARINE" VARCHAR(20),
    "REP_M_AREA" DECIMAL(65,30),
    "GIS_M_AREA" DECIMAL(65,30),
    "REP_AREA" DECIMAL(65,30),
    "GIS_AREA" DECIMAL(65,30),
    "NO_TAKE" VARCHAR(50),
    "NO_TK_AREA" DECIMAL(65,30),
    "STATUS" VARCHAR(100),
    "STATUS_YR" INTEGER,
    "GOV_TYPE" VARCHAR(254),
    "OWN_TYPE" VARCHAR(254),
    "MANG_AUTH" VARCHAR(254),
    "MANG_PLAN" VARCHAR(254),
    "VERIF" VARCHAR(20),
    "METADATAID" INTEGER,
    "SUB_LOC" VARCHAR(100),
    "PARENT_ISO" VARCHAR(50),
    "ISO3" VARCHAR(50),
    "SUPP_INFO" VARCHAR(254),
    "CONS_OBJ" VARCHAR(100),
    "geom" geometry,

    CONSTRAINT "ProtectedArea_pkey" PRIMARY KEY ("gid")
);

-- CreateIndex
CREATE INDEX "ProtectedArea_geom_idx" ON "ProtectedArea" USING GIST ("geom");

-- AddForeignKey
ALTER TABLE "SiteRelation" ADD CONSTRAINT "SiteRelation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteRelation" ADD CONSTRAINT "SiteRelation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

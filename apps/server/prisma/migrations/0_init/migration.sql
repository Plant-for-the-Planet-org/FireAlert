-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ROLE_CLIENT', 'ROLE_ADMIN', 'ROLE_SUPPORT');

-- CreateEnum
CREATE TYPE "AlertMethodMethod" AS ENUM ('email', 'sms', 'device');

-- CreateEnum
CREATE TYPE "AlertMethodDeviceType" AS ENUM ('ios', 'android');

-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('Point', 'Polygon', 'MultiPolygon');

-- CreateEnum
CREATE TYPE "AlertDetectedBy" AS ENUM ('MODIS', 'VIIRS', 'LANDSAT', 'GEOSTATIONARY');

-- CreateEnum
CREATE TYPE "AlertConfidence" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "guid" TEXT,
    "sub" TEXT,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" BOOLEAN,
    "useGeostationary" BOOLEAN NOT NULL DEFAULT false,
    "isPlanetRO" BOOLEAN,
    "image" TEXT,
    "avatar" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isVerified" BOOLEAN,
    "lastLogin" TIMESTAMP(3),
    "signupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roles" "Role" NOT NULL DEFAULT 'ROLE_CLIENT',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "AlertMethod" (
    "id" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "method" "AlertMethodMethod" NOT NULL,
    "destination" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deviceType" "AlertMethodDeviceType",
    "notificationToken" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AlertMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "guid" TEXT,
    "name" TEXT,
    "type" "SiteType" NOT NULL,
    "geometry" JSONB NOT NULL,
    "detectionCoordinates" JSONB NOT NULL,
    "radius" INTEGER NOT NULL DEFAULT 0,
    "isMonitored" BOOLEAN NOT NULL DEFAULT true,
    "lastSynced" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "projectId" TEXT,
    "lastUpdated" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "lastUpdated" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "eventDate" TEXT NOT NULL,
    "detectedBy" "AlertDetectedBy" NOT NULL,
    "confidence" "AlertConfidence" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "frp" DOUBLE PRECISION NOT NULL,
    "isDelivered" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "siteId" TEXT NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_guid_key" ON "User"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "AlertMethod_guid_key" ON "AlertMethod"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "AlertMethod_destination_key" ON "AlertMethod"("destination");

-- CreateIndex
CREATE UNIQUE INDEX "Site_guid_key" ON "Site"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_guid_key" ON "Alert"("guid");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertMethod" ADD CONSTRAINT "AlertMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


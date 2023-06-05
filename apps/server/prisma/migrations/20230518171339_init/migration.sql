-- CreateEnum
CREATE TYPE "SiteOrigin" AS ENUM ('firealert', 'ttc');

-- CreateEnum
CREATE TYPE "GeoEventSource" AS ENUM ('FIRMS');

-- CreateEnum
CREATE TYPE "GeoEventProviderSourceKey" AS ENUM ('LANDSAT_NRT', 'MODIS_NRT', 'MODIS_SP', 'VIIRS_NOAA20_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_SNPP_SP');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ROLE_CLIENT', 'ROLE_ADMIN', 'ROLE_SUPPORT');

-- CreateEnum
CREATE TYPE "AlertMethodMethod" AS ENUM ('email', 'sms', 'device', 'whatsapp', 'webhook');

-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('Point', 'Polygon', 'MultiPolygon');

-- CreateEnum
CREATE TYPE "GeoEventDetectionInstrument" AS ENUM ('MODIS', 'VIIRS', 'LANDSAT', 'GEOSTATIONARY');

-- CreateEnum
CREATE TYPE "AlertConfidence" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('fire');

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
    "sub" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "detectionMethods" JSONB NOT NULL,
    "isPlanetRO" BOOLEAN,
    "remoteId" TEXT,
    "image" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isVerified" BOOLEAN,
    "lastLogin" TIMESTAMP(3),
    "signupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roles" "Role" NOT NULL DEFAULT 'ROLE_CLIENT',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "alertMethodId" TEXT NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertMethod" (
    "id" TEXT NOT NULL,
    "method" "AlertMethodMethod" NOT NULL,
    "destination" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deviceName" TEXT,
    "deviceId" TEXT,
    "tokenSentCount" INTEGER NOT NULL DEFAULT 0,
    "lastTokenSentDate" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "failCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AlertMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT,
    "name" TEXT,
    "origin" "SiteOrigin" NOT NULL DEFAULT 'firealert',
    "type" "SiteType" NOT NULL,
    "geometry" JSONB NOT NULL,
    "radius" INTEGER NOT NULL DEFAULT 0,
    "isMonitored" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "projectId" TEXT,
    "lastUpdated" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "originalGeometry" GEOMETRY,
    "detectionGeometry" GEOMETRY,

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
CREATE TABLE "GeoEventProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "type" "AlertType" NOT NULL,
    "isActive" BOOLEAN NOT NULL,    
    "providerKey" "GeoEventSource" NOT NULL,
    "config" JSONB NOT NULL,
    "fetchFrequency" INTEGER,
    "lastRun" TIMESTAMP(3),

    CONSTRAINT "GeoEventProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoEvent" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "confidence" "AlertConfidence" NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "identityGroup" TEXT NOT NULL,
    "providerKey" "GeoEventSource" NOT NULL,
    "geometry" GEOMETRY,
    "radius" INTEGER,
    "data" JSONB,

    CONSTRAINT "GeoEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteAlert" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "detectedBy" "GeoEventDetectionInstrument" NOT NULL,
    "confidence" "AlertConfidence" NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "distance" INTEGER NOT NULL,
    "data" JSONB,

    CONSTRAINT "SiteAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "siteAlertId" TEXT NOT NULL,
    "alertMethod" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) DEFAULT NULL,
    "isDelivered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Create Index
CREATE UNIQUE INDEX "User_sub_key" ON "User"("sub");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRequest_token_key" ON "VerificationRequest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRequest_alertMethodId_key" ON "VerificationRequest"("alertMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRequest_id_token_key" ON "VerificationRequest"("id", "token");

-- CreateIndex
CREATE UNIQUE INDEX "AlertMethod_destination_userId_method_key" ON "AlertMethod"("destination", "userId", "method");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_alertMethodId_fkey" FOREIGN KEY ("alertMethodId") REFERENCES "AlertMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertMethod" ADD CONSTRAINT "AlertMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteAlert" ADD CONSTRAINT "SiteAlert_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_siteAlertId_fkey" FOREIGN KEY ("siteAlertId") REFERENCES "SiteAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

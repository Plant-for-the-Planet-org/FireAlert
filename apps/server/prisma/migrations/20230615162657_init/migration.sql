-- CreateEnum
CREATE TYPE "SiteOrigin" AS ENUM ('firealert', 'ttc');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ROLE_CLIENT', 'ROLE_ADMIN', 'ROLE_SUPPORT');

-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('Point', 'Polygon', 'MultiPolygon');

-- CreateEnum
CREATE TYPE "AlertConfidence" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "sub" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "detectionMethods" JSONB NOT NULL,
    "isPlanetRO" BOOLEAN,
    "image" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isVerified" BOOLEAN,
    "lastLogin" TIMESTAMP(3),
    "signupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roles" "Role" NOT NULL DEFAULT 'ROLE_CLIENT',
    "remoteId" TEXT,

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
    "method" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deviceName" TEXT,
    "deviceId" TEXT,
    "tokenSentCount" INTEGER NOT NULL DEFAULT 0,
    "lastTokenSentDate" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
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
    "slices" JSONB,
    "detectionGeometry" geometry,
    "originalGeometry" geometry,

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
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "providerKey" TEXT NOT NULL,
    "lastRun" TIMESTAMP(3),
    "fetchFrequency" INTEGER,
    "config" JSONB NOT NULL,

    CONSTRAINT "GeoEventProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "geometry" geometry,
    "confidence" "AlertConfidence" NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "providerKey" TEXT NOT NULL,
    "identityGroup" TEXT NOT NULL,
    "geoEventProviderId" TEXT NOT NULL,
    "radius" INTEGER,
    "slice" TEXT NOT NULL,
    "data" JSONB,

    CONSTRAINT "GeoEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteAlert" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "detectedBy" TEXT NOT NULL,
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
    "sentAt" TIMESTAMP(3),
    "isDelivered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_sub_key" ON "User"("sub");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRequest_token_key" ON "VerificationRequest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRequest_alertMethodId_key" ON "VerificationRequest"("alertMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRequest_id_token_key" ON "VerificationRequest"("id", "token");

-- CreateIndex
CREATE UNIQUE INDEX "AlertMethod_destination_userId_method_key" ON "AlertMethod"("destination", "userId", "method");

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

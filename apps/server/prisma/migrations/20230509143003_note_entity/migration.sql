-- CreateTable
CREATE TABLE "WorldFireAlert" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" "AlertConfidence" NOT NULL,
    "detectedBy" "AlertDetectedBy" NOT NULL,
    "frp" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WorldFireAlert_pkey" PRIMARY KEY ("id")
);

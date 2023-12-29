-- CreateTable
CREATE TABLE "Stats" (
    "id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stats_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Stats_metric_key" UNIQUE ("metric")
);

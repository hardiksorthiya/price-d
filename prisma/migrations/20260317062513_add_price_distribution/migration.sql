-- CreateTable
CREATE TABLE "PriceDistribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "metal" TEXT NOT NULL,
    "karat" INTEGER,
    "price" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "PriceDistribution_shop_idx" ON "PriceDistribution"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "PriceDistribution_shop_metal_karat_key" ON "PriceDistribution"("shop", "metal", "karat");

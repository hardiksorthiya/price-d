-- CreateTable
CREATE TABLE "DiamondPriceRange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "minCarat" REAL NOT NULL,
    "maxCarat" REAL NOT NULL,
    "price" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "DiamondPriceRange_shop_idx" ON "DiamondPriceRange"("shop");

-- CreateIndex
CREATE INDEX "DiamondPriceRange_shop_minCarat_maxCarat_idx" ON "DiamondPriceRange"("shop", "minCarat", "maxCarat");

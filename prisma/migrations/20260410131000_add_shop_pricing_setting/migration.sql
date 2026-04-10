-- CreateTable
CREATE TABLE "ShopPricingSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "taxPercentage" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopPricingSetting_shop_key" ON "ShopPricingSetting"("shop");

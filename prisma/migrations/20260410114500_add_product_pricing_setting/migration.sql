-- CreateTable
CREATE TABLE "ProductPricingSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "metalWeight" TEXT NOT NULL,
    "diamondCaratWeight" TEXT NOT NULL,
    "makingCharge" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ProductPricingSetting_shop_idx" ON "ProductPricingSetting"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPricingSetting_shop_productId_key" ON "ProductPricingSetting"("shop", "productId");

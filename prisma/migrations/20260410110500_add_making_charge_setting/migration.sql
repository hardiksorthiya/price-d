-- CreateTable
CREATE TABLE "MakingChargeSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "chargeType" TEXT NOT NULL,
    "chargeValue" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MakingChargeSetting_shop_key" ON "MakingChargeSetting"("shop");

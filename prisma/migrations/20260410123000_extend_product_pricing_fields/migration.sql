-- AlterTable
ALTER TABLE "ProductPricingSetting" ADD COLUMN "metalType" TEXT NOT NULL DEFAULT 'gold';
ALTER TABLE "ProductPricingSetting" ADD COLUMN "goldKarat" TEXT NOT NULL DEFAULT '22';
ALTER TABLE "ProductPricingSetting" ADD COLUMN "diamondQuality" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProductPricingSetting" ADD COLUMN "diamondColor" TEXT NOT NULL DEFAULT '';

export type ProductRow = {
  id: string;
  variantId: string;
  parentProductId: string;
  title: string;
  handle: string;
  productType: string;
  sku: string;
  tracked: boolean;
  imageUrl: string | null;
};

export type ProductPricingValue = {
  productId: string;
  metalType: "gold" | "silver" | "platinum";
  goldKarat: "" | "10" | "14" | "18" | "22";
  diamondQuality: string;
  diamondColor: string;
  metalWeight: string;
  diamondCaratWeight: string;
  makingCharge: string;
};

export type PricesByMetal = Record<string, Record<string, string>>;

export type DiamondRange = {
  diamondQuality: string;
  diamondColor: string;
  minCarat: number;
  maxCarat: number;
  price: string;
};

export type ProductPricingLoaderData = {
  products: ProductRow[];
  pricingByProductId: Record<string, ProductPricingValue>;
  pricesByMetal: PricesByMetal;
  diamondRanges: DiamondRange[];
  taxPercentage: string;
  modelReady: boolean;
};

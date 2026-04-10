export type DiamondRange = {
  diamondQuality: string;
  diamondColor: string;
  minCarat: string;
  maxCarat: string;
  price: string;
};

export type PricesByMetal = Record<string, Record<string, string>>;

export type PricingLoaderData = {
  prices: PricesByMetal;
  diamondRanges: DiamondRange[];
  taxPercentage: string;
  shop: string;
  modelReady: boolean;
};

export type PricingFormState = {
  gold: Record<"10" | "14" | "18" | "22", string>;
  silver: string;
  platinum: string;
  diamond: DiamondRange[];
  taxPercentage: string;
};

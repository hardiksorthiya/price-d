import type { DiamondRange, PricesByMetal } from "./types";

export const GOLD_KARATS = [10, 14, 18, 22] as const;

export const EMPTY_PRICES: PricesByMetal = {
  gold: { "10": "", "14": "", "18": "", "22": "" },
  silver: { "": "" },
  platinum: { "": "" },
};

export const DEFAULT_DIAMOND_RANGE: DiamondRange = {
  diamondQuality: "",
  diamondColor: "",
  minCarat: "1",
  maxCarat: "2",
  price: "",
};

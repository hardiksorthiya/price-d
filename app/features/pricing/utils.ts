import { DEFAULT_DIAMOND_RANGE } from "./constants";
import type {
  DiamondRange,
  PricingFormState,
  PricesByMetal,
} from "./types";

export const cloneDiamondRange = (range: DiamondRange): DiamondRange => ({
  diamondQuality: range.diamondQuality ?? "",
  diamondColor: range.diamondColor ?? "",
  minCarat: range.minCarat ?? "",
  maxCarat: range.maxCarat ?? "",
  price: range.price ?? "",
});

export const createDefaultDiamondRange = (): DiamondRange =>
  cloneDiamondRange(DEFAULT_DIAMOND_RANGE);

export const buildInitialFormState = (
  prices: PricesByMetal,
  diamondRanges: DiamondRange[],
  taxPercentage: string,
): PricingFormState => ({
  gold: {
    "10": prices.gold?.["10"] ?? "",
    "14": prices.gold?.["14"] ?? "",
    "18": prices.gold?.["18"] ?? "",
    "22": prices.gold?.["22"] ?? "",
  },
  silver: prices.silver?.[""] ?? "",
  platinum: prices.platinum?.[""] ?? "",
  diamond:
    diamondRanges.length > 0
      ? diamondRanges.map(cloneDiamondRange)
      : [createDefaultDiamondRange()],
  taxPercentage: taxPercentage ?? "",
});

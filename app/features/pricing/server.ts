import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import prisma from "../../db.server";
import { authenticate } from "../../shopify.server";
import {
  DEFAULT_DIAMOND_RANGE,
  EMPTY_PRICES,
  GOLD_KARATS,
} from "./constants";
import type { DiamondRange, PricingLoaderData } from "./types";

type PriceModel = {
  findMany: (args: object) => Promise<unknown[]>;
  deleteMany: (args: object) => Promise<unknown>;
  upsert: (args: object) => Promise<unknown>;
};

type DiamondModel = {
  findMany: (args: object) => Promise<unknown[]>;
  deleteMany: (args: object) => Promise<unknown>;
  createMany: (args: object) => Promise<unknown>;
};

type ShopPricingSettingModel = {
  findUnique: (args: object) => Promise<unknown | null>;
  upsert: (args: object) => Promise<unknown>;
  deleteMany: (args: object) => Promise<unknown>;
};

const getPriceModel = () =>
  (prisma as { priceDistribution?: PriceModel }).priceDistribution;

const getDiamondModel = () =>
  (prisma as { diamondPriceRange?: DiamondModel }).diamondPriceRange;

const getShopPricingSettingModel = () =>
  (prisma as { shopPricingSetting?: ShopPricingSettingModel }).shopPricingSetting;

const isUnknownDiamondFieldError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("Unknown argument `diamondQuality`") ||
    error.message.includes("Unknown argument `diamondColor`")
  );
};

const isMissingShopPricingSettingTableError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("ShopPricingSetting") &&
    (error.message.includes("does not exist") ||
      error.message.includes("no such table"))
  );
};

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<PricingLoaderData> => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const model = getPriceModel();
  const diamondModel = getDiamondModel();
  const shopPricingModel = getShopPricingSettingModel();
  if (!model || !diamondModel) {
    return {
      prices: EMPTY_PRICES,
      diamondRanges: [],
      taxPercentage: "0",
      shop,
      modelReady: false,
    };
  }

  const rows = (await model.findMany({
    where: { shop },
    orderBy: [{ metal: "asc" }, { karat: "asc" }],
  })) as { metal: string; karat: number | null; price: string }[];

  let diamondRows: {
    diamondQuality?: string;
    diamondColor?: string;
    minCarat: number;
    maxCarat: number;
    price: string;
  }[] = [];

  try {
    diamondRows = (await diamondModel.findMany({
      where: { shop },
      orderBy: [
        { diamondQuality: "asc" },
        { diamondColor: "asc" },
        { minCarat: "asc" },
        { maxCarat: "asc" },
      ],
    })) as {
      diamondQuality?: string;
      diamondColor?: string;
      minCarat: number;
      maxCarat: number;
      price: string;
    }[];
  } catch (error) {
    if (!isUnknownDiamondFieldError(error)) throw error;
    diamondRows = (await diamondModel.findMany({
      where: { shop },
      orderBy: [{ minCarat: "asc" }, { maxCarat: "asc" }],
    })) as {
      minCarat: number;
      maxCarat: number;
      price: string;
    }[];
  }

  const prices: Record<string, Record<string, string>> = {
    gold: { ...EMPTY_PRICES.gold },
    silver: { ...EMPTY_PRICES.silver },
    platinum: { ...EMPTY_PRICES.platinum },
  };
  for (const row of rows) {
    const key = row.karat != null ? String(row.karat) : "";
    if (row.metal === "gold") {
      prices.gold[key] = row.price;
    } else if (prices[row.metal]) {
      prices[row.metal][""] = row.price;
    }
  }

  const diamondRanges: DiamondRange[] =
    diamondRows.length > 0
      ? diamondRows.map((row) => ({
          diamondQuality: row.diamondQuality ?? "",
          diamondColor: row.diamondColor ?? "",
          minCarat: String(row.minCarat),
          maxCarat: String(row.maxCarat),
          price: row.price,
        }))
      : [{ ...DEFAULT_DIAMOND_RANGE }];

  let taxPercentage = "0";
  if (shopPricingModel) {
    try {
      const setting = (await shopPricingModel.findUnique({
        where: { shop },
      })) as { taxPercentage: string } | null;
      if (setting?.taxPercentage) {
        taxPercentage = setting.taxPercentage;
      }
    } catch (error) {
      if (!isMissingShopPricingSettingTableError(error)) throw error;
    }
  }

  return { prices, diamondRanges, taxPercentage, shop, modelReady: true };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const model = getPriceModel();
  const diamondModel = getDiamondModel();
  const shopPricingModel = getShopPricingSettingModel();
  if (!model || !diamondModel) {
    return { ok: false };
  }

  const toSave: { metal: string; karat: number | null; price: string }[] = [];

  for (const karat of GOLD_KARATS) {
    const raw = formData.get(`gold_${karat}`);
    const price = typeof raw === "string" ? raw.trim() : "";
    if (!price) continue;
    const value = parseFloat(price);
    if (!Number.isNaN(value) && value >= 0) {
      toSave.push({ metal: "gold", karat, price: String(value) });
    }
  }

  for (const metal of ["silver", "platinum"] as const) {
    const raw = formData.get(metal);
    const price = typeof raw === "string" ? raw.trim() : "";
    if (!price) continue;
    const value = parseFloat(price);
    if (!Number.isNaN(value) && value >= 0) {
      toSave.push({ metal, karat: null, price: String(value) });
    }
  }

  const existing = (await model.findMany({
    where: { shop },
    select: { metal: true, karat: true },
  })) as { metal: string; karat: number | null }[];

  const saveSet = new Set(toSave.map((item) => `${item.metal}:${item.karat ?? ""}`));
  for (const item of existing) {
    const key = `${item.metal}:${item.karat ?? ""}`;
    if (!saveSet.has(key)) {
      await model.deleteMany({
        where: { shop, metal: item.metal, karat: item.karat },
      });
    }
  }

  for (const item of toSave) {
    await model.upsert({
      where: {
        shop_metal_karat: { shop, metal: item.metal, karat: item.karat },
      },
      create: { shop, metal: item.metal, karat: item.karat, price: item.price },
      update: { price: item.price },
    });
  }

  const diamondCountRaw = formData.get("diamond_count");
  const diamondCount =
    typeof diamondCountRaw === "string" ? parseInt(diamondCountRaw, 10) : 0;

  const diamondToCreate: {
    shop: string;
    diamondQuality: string;
    diamondColor: string;
    minCarat: number;
    maxCarat: number;
    price: string;
  }[] = [];

  for (let i = 0; i < diamondCount; i++) {
    const qualityRaw = formData.get(`diamond_quality_${i}`);
    const colorRaw = formData.get(`diamond_color_${i}`);
    const minRaw = formData.get(`diamond_min_${i}`);
    const maxRaw = formData.get(`diamond_max_${i}`);
    const priceRaw = formData.get(`diamond_price_${i}`);

    const quality = typeof qualityRaw === "string" ? qualityRaw.trim() : "";
    const color = typeof colorRaw === "string" ? colorRaw.trim() : "";
    const minStr = typeof minRaw === "string" ? minRaw.trim() : "";
    const maxStr = typeof maxRaw === "string" ? maxRaw.trim() : "";
    const priceStr = typeof priceRaw === "string" ? priceRaw.trim() : "";

    if (!quality && !color && !minStr && !maxStr && !priceStr) continue;

    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    const price = parseFloat(priceStr);
    if (
      !quality ||
      !color ||
      Number.isNaN(min) ||
      Number.isNaN(max) ||
      Number.isNaN(price) ||
      min < 0 ||
      max <= min ||
      price < 0
    ) {
      continue;
    }

    diamondToCreate.push({
      shop,
      diamondQuality: quality,
      diamondColor: color,
      minCarat: min,
      maxCarat: max,
      price: String(price),
    });
  }

  await diamondModel.deleteMany({ where: { shop } });
  if (diamondToCreate.length > 0) {
    try {
      await diamondModel.createMany({ data: diamondToCreate });
    } catch (error) {
      if (!isUnknownDiamondFieldError(error)) throw error;
      await diamondModel.createMany({
        data: diamondToCreate.map((row) => ({
          shop: row.shop,
          minCarat: row.minCarat,
          maxCarat: row.maxCarat,
          price: row.price,
        })),
      });
    }
  }

  const taxRaw = formData.get("tax_percentage");
  const taxValue = typeof taxRaw === "string" ? taxRaw.trim() : "";
  const taxNum = parseFloat(taxValue);

  if (shopPricingModel) {
    try {
      if (taxValue && !Number.isNaN(taxNum) && taxNum >= 0) {
        await shopPricingModel.upsert({
          where: { shop },
          create: { shop, taxPercentage: String(taxNum) },
          update: { taxPercentage: String(taxNum) },
        });
      } else {
        await shopPricingModel.deleteMany({ where: { shop } });
      }
    } catch (error) {
      if (!isMissingShopPricingSettingTableError(error)) throw error;
    }
  }

  return { ok: true };
};

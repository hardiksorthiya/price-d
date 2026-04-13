import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import prisma from "../../db.server";
import { authenticate } from "../../shopify.server";
import {
  getActiveSubscription,
  getPlanBySubscriptionName,
  getShopPlanInfo,
  getVariantLimitByPlan,
} from "../../lib/billing.server";
import type {
  ProductPricingLoaderData,
  ProductRow,
} from "./types";

type ProductPricingModel = {
  findMany: (args: object) => Promise<unknown[]>;
  deleteMany: (args: object) => Promise<unknown>;
  upsert: (args: object) => Promise<unknown>;
};

type PriceDistributionModel = {
  findMany: (args: object) => Promise<unknown[]>;
};

type DiamondPriceRangeModel = {
  findMany: (args: object) => Promise<unknown[]>;
};

type ShopPricingSettingModel = {
  findUnique: (args: object) => Promise<unknown | null>;
};

const getProductPricingModel = () =>
  (prisma as { productPricingSetting?: ProductPricingModel }).productPricingSetting;

const getPriceDistributionModel = () =>
  (prisma as { priceDistribution?: PriceDistributionModel }).priceDistribution;

const getDiamondPriceRangeModel = () =>
  (prisma as { diamondPriceRange?: DiamondPriceRangeModel }).diamondPriceRange;

const getShopPricingSettingModel = () =>
  (prisma as { shopPricingSetting?: ShopPricingSettingModel }).shopPricingSetting;

const isMissingProductPricingTableError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("ProductPricingSetting") &&
    (error.message.includes("does not exist") ||
      error.message.includes("no such table") ||
      error.message.includes("no such column"))
  );
};

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

const toNumber = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeText = (value: string) => value.trim().toLowerCase();
const toMoney = (value: number) => Number(value.toFixed(2));

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<ProductPricingLoaderData> => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const response = await admin.graphql(
    `#graphql
      query ProductPricingInventoryList {
        inventoryItems(first: 100) {
          edges {
            node {
              id
              sku
              tracked
              variant {
                id
                title
                product {
                  id
                  title
                  handle
                  productType
                  featuredImage {
                    url
                  }
                }
              }
            }
          }
        }
      }`,
  );
  const responseJson = await response.json();
  const nodes = responseJson?.data?.inventoryItems?.edges ?? [];

  const products: ProductRow[] = nodes.map(
    (edge: {
      node: {
        id: string;
        sku?: string | null;
        tracked?: boolean | null;
        variant?: {
          id?: string | null;
          title?: string | null;
          product?: {
            id?: string | null;
            title?: string | null;
            handle?: string | null;
            productType?: string | null;
            featuredImage?: { url?: string | null } | null;
          } | null;
        } | null;
      };
    }) => ({
      id: edge.node.id,
      variantId: edge.node.variant?.id ?? "",
      parentProductId: edge.node.variant?.product?.id ?? "",
      title:
        edge.node.variant?.product?.title && edge.node.variant?.title
          ? `${edge.node.variant.product.title} (${edge.node.variant.title})`
          : edge.node.variant?.product?.title ?? "Untitled inventory item",
      handle: edge.node.variant?.product?.handle ?? "",
      productType: edge.node.variant?.product?.productType ?? "Uncategorized",
      sku: edge.node.sku ?? "",
      tracked: Boolean(edge.node.tracked),
      imageUrl: edge.node.variant?.product?.featuredImage?.url ?? null,
    }),
  );

  const priceDistributionModel = getPriceDistributionModel();
  const diamondPriceRangeModel = getDiamondPriceRangeModel();
  const shopPricingSettingModel = getShopPricingSettingModel();

  const pricesByMetal: ProductPricingLoaderData["pricesByMetal"] = {
    gold: { "10": "", "14": "", "18": "", "22": "" },
    silver: { "": "" },
    platinum: { "": "" },
  };
  if (priceDistributionModel) {
    const metalRows = (await priceDistributionModel.findMany({
      where: { shop },
    })) as { metal: string; karat: number | null; price: string }[];
    for (const row of metalRows) {
      if (row.metal === "gold") {
        pricesByMetal.gold[String(row.karat ?? "")] = row.price;
      } else if (pricesByMetal[row.metal]) {
        pricesByMetal[row.metal][""] = row.price;
      }
    }
  }

  let diamondRanges: ProductPricingLoaderData["diamondRanges"] = [];
  if (diamondPriceRangeModel) {
    try {
      diamondRanges = (await diamondPriceRangeModel.findMany({
        where: { shop },
        orderBy: [
          { diamondQuality: "asc" },
          { diamondColor: "asc" },
          { minCarat: "asc" },
          { maxCarat: "asc" },
        ],
      })) as ProductPricingLoaderData["diamondRanges"];
    } catch (error) {
      if (!isUnknownDiamondFieldError(error)) throw error;
      diamondRanges = (await diamondPriceRangeModel.findMany({
        where: { shop },
        orderBy: [{ minCarat: "asc" }, { maxCarat: "asc" }],
      })) as ProductPricingLoaderData["diamondRanges"];
    }
  }

  let taxPercentage = "0";
  if (shopPricingSettingModel) {
    try {
      const setting = (await shopPricingSettingModel.findUnique({
        where: { shop },
      })) as { taxPercentage: string } | null;
      if (setting?.taxPercentage) taxPercentage = setting.taxPercentage;
    } catch (error) {
      if (!isMissingShopPricingSettingTableError(error)) throw error;
    }
  }

  const model = getProductPricingModel();
  if (!model) {
    return {
      products,
      pricingByProductId: {},
      pricesByMetal,
      diamondRanges,
      taxPercentage,
      modelReady: false,
    };
  }

  let rows: {
    productId: string;
    metalType: "gold" | "silver" | "platinum";
    goldKarat: "" | "10" | "14" | "18" | "22";
    diamondQuality: string;
    diamondColor: string;
    metalWeight: string;
    diamondCaratWeight: string;
    makingCharge: string;
  }[] = [];
  let modelReady = true;
  try {
    rows = (await model.findMany({
      where: { shop },
    })) as {
      productId: string;
      metalType: "gold" | "silver" | "platinum";
      goldKarat: "" | "10" | "14" | "18" | "22";
      diamondQuality: string;
      diamondColor: string;
      metalWeight: string;
      diamondCaratWeight: string;
      makingCharge: string;
    }[];
  } catch (error) {
    if (!isMissingProductPricingTableError(error)) throw error;
    modelReady = false;
  }

  const pricingByProductId: ProductPricingLoaderData["pricingByProductId"] = {};
  for (const row of rows) {
    pricingByProductId[row.productId] = {
      productId: row.productId,
      metalType: row.metalType ?? "gold",
      goldKarat: row.goldKarat ?? "22",
      diamondQuality: row.diamondQuality ?? "",
      diamondColor: row.diamondColor ?? "",
      metalWeight: row.metalWeight ?? "",
      diamondCaratWeight: row.diamondCaratWeight ?? "",
      makingCharge: row.makingCharge ?? "",
    };
  }

  return {
    products,
    pricingByProductId,
    pricesByMetal,
    diamondRanges,
    taxPercentage,
    modelReady,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const model = getProductPricingModel();
  if (!model) return { ok: false };

  const countRaw = formData.get("product_count");
  const count = typeof countRaw === "string" ? parseInt(countRaw, 10) : 0;

  const priceDistributionModel = getPriceDistributionModel();
  const diamondPriceRangeModel = getDiamondPriceRangeModel();
  const shopPricingSettingModel = getShopPricingSettingModel();

  const pricesByMetal: ProductPricingLoaderData["pricesByMetal"] = {
    gold: { "10": "", "14": "", "18": "", "22": "" },
    silver: { "": "" },
    platinum: { "": "" },
  };
  if (priceDistributionModel) {
    const metalRows = (await priceDistributionModel.findMany({
      where: { shop },
    })) as { metal: string; karat: number | null; price: string }[];
    for (const row of metalRows) {
      if (row.metal === "gold") {
        pricesByMetal.gold[String(row.karat ?? "")] = row.price;
      } else if (pricesByMetal[row.metal]) {
        pricesByMetal[row.metal][""] = row.price;
      }
    }
  }

  let diamondRanges: ProductPricingLoaderData["diamondRanges"] = [];
  if (diamondPriceRangeModel) {
    try {
      diamondRanges = (await diamondPriceRangeModel.findMany({
        where: { shop },
        orderBy: [
          { diamondQuality: "asc" },
          { diamondColor: "asc" },
          { minCarat: "asc" },
          { maxCarat: "asc" },
        ],
      })) as ProductPricingLoaderData["diamondRanges"];
    } catch (error) {
      if (!isUnknownDiamondFieldError(error)) throw error;
      diamondRanges = (await diamondPriceRangeModel.findMany({
        where: { shop },
        orderBy: [{ minCarat: "asc" }, { maxCarat: "asc" }],
      })) as ProductPricingLoaderData["diamondRanges"];
    }
  }

  let taxPercentage = "0";
  if (shopPricingSettingModel) {
    try {
      const setting = (await shopPricingSettingModel.findUnique({
        where: { shop },
      })) as { taxPercentage: string } | null;
      if (setting?.taxPercentage) taxPercentage = setting.taxPercentage;
    } catch (error) {
      if (!isMissingShopPricingSettingTableError(error)) throw error;
    }
  }

  const toSave: {
    shop: string;
    productId: string;
    metalType: "gold" | "silver" | "platinum";
    goldKarat: "" | "10" | "14" | "18" | "22";
    diamondQuality: string;
    diamondColor: string;
    metalWeight: string;
    diamondCaratWeight: string;
    makingCharge: string;
  }[] = [];

  const variantLinks: {
    productId: string;
    variantId: string;
    parentProductId: string;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const productIdRaw = formData.get(`product_id_${i}`);
    const variantIdRaw = formData.get(`variant_id_${i}`);
    const parentProductIdRaw = formData.get(`parent_product_id_${i}`);
    const metalRaw = formData.get(`metal_weight_${i}`);
    const diamondRaw = formData.get(`diamond_carat_weight_${i}`);
    const makingRaw = formData.get(`making_charge_${i}`);
    const metalTypeRaw = formData.get(`metal_type_${i}`);
    const goldKaratRaw = formData.get(`gold_karat_${i}`);
    const diamondQualityRaw = formData.get(`diamond_quality_${i}`);
    const diamondColorRaw = formData.get(`diamond_color_${i}`);

    const productId = typeof productIdRaw === "string" ? productIdRaw : "";
    if (!productId) continue;
    const variantId = typeof variantIdRaw === "string" ? variantIdRaw : "";
    const parentProductId =
      typeof parentProductIdRaw === "string" ? parentProductIdRaw : "";

    const metalType =
      metalTypeRaw === "silver" || metalTypeRaw === "platinum"
        ? metalTypeRaw
        : "gold";
    const goldKarat =
      goldKaratRaw === "10" ||
      goldKaratRaw === "14" ||
      goldKaratRaw === "18" ||
      goldKaratRaw === "22"
        ? goldKaratRaw
        : "22";
    const diamondQuality =
      typeof diamondQualityRaw === "string" ? diamondQualityRaw.trim() : "";
    const diamondColor =
      typeof diamondColorRaw === "string" ? diamondColorRaw.trim() : "";

    const metalWeight = typeof metalRaw === "string" ? metalRaw.trim() : "";
    const diamondCaratWeight =
      typeof diamondRaw === "string" ? diamondRaw.trim() : "";
    const makingCharge = typeof makingRaw === "string" ? makingRaw.trim() : "";

    const hasAnyValue = metalWeight || diamondCaratWeight || makingCharge || diamondQuality || diamondColor;
    if (!hasAnyValue) continue;

    const metal = parseFloat(metalWeight || "0");
    const diamond = parseFloat(diamondCaratWeight || "0");
    const making = parseFloat(makingCharge || "0");
    const isValid =
      (!metalWeight || (!Number.isNaN(metal) && metal >= 0)) &&
      (!diamondCaratWeight || (!Number.isNaN(diamond) && diamond >= 0)) &&
      (!makingCharge || (!Number.isNaN(making) && making >= 0));

    if (!isValid) continue;

    toSave.push({
      shop,
      productId,
      metalType,
      goldKarat: metalType === "gold" ? goldKarat : "",
      diamondQuality,
      diamondColor,
      metalWeight: metalWeight ? String(metal) : "",
      diamondCaratWeight: diamondCaratWeight ? String(diamond) : "",
      makingCharge: makingCharge ? String(making) : "",
    });

    variantLinks.push({ productId, variantId, parentProductId });
  }

  // Enforce plan-based configured variant limits.
  const activeSubscription = await getActiveSubscription(admin);
  const shopPlanInfo = await getShopPlanInfo(admin);
  const activePlan = activeSubscription
    ? getPlanBySubscriptionName(activeSubscription.name)
    : "free";
  if (activePlan === "free" && !shopPlanInfo.partnerDevelopment) {
    return {
      ok: false,
      errors: [
        "Free plan is available only for development stores. Please choose a paid plan from the Plans page to continue.",
      ],
    };
  }
  const variantLimit = getVariantLimitByPlan(activePlan);
  if (variantLimit !== null && toSave.length > variantLimit) {
    return {
      ok: false,
      errors: [
        `Your ${activePlan} plan supports up to ${variantLimit} variants. You are trying to save ${toSave.length}. Upgrade plan from the Plans page.`,
      ],
    };
  }

  try {
    await model.deleteMany({ where: { shop } });
    for (const row of toSave) {
      await model.upsert({
        where: { shop_productId: { shop: row.shop, productId: row.productId } },
        create: row,
        update: {
          metalType: row.metalType,
          goldKarat: row.goldKarat,
          diamondQuality: row.diamondQuality,
          diamondColor: row.diamondColor,
          metalWeight: row.metalWeight,
          diamondCaratWeight: row.diamondCaratWeight,
          makingCharge: row.makingCharge,
        },
      });
    }
  } catch (error) {
    if (!isMissingProductPricingTableError(error)) throw error;
    return { ok: false };
  }

  // Push calculated prices to Shopify variants so storefront reflects custom pricing.
  const updatesByProductId = new Map<string, { id: string; price: string }[]>();
  const metafieldsToSet: { ownerId: string; namespace: string; key: string; type: string; value: string }[] = [];
  let skippedVariantCount = 0;
  for (const row of toSave) {
    const variantLink = variantLinks.find((v) => v.productId === row.productId);
    if (!variantLink?.variantId || !variantLink.parentProductId) {
      skippedVariantCount += 1;
      continue;
    }

    const metalRate =
      row.metalType === "gold"
        ? toNumber(pricesByMetal.gold?.[row.goldKarat || "22"] ?? "0")
        : toNumber(pricesByMetal[row.metalType]?.[""] ?? "0");
    const metalTotal = toNumber(row.metalWeight) * metalRate;

    const selectedQuality = normalizeText(row.diamondQuality);
    const selectedColor = normalizeText(row.diamondColor);
    const diamondWeight = toNumber(row.diamondCaratWeight);

    const sameQualityColorRanges = diamondRanges.filter((range) => {
      if (!selectedQuality || !selectedColor) return false;
      return (
        normalizeText(range.diamondQuality ?? "") === selectedQuality &&
        normalizeText(range.diamondColor ?? "") === selectedColor
      );
    });
    const matchedByRange = sameQualityColorRanges.find(
      (range) =>
        diamondWeight > 0 &&
        diamondWeight >= range.minCarat &&
        diamondWeight <= range.maxCarat,
    );
    const matchedDiamond = matchedByRange ?? sameQualityColorRanges[0];
    const diamondRate = toNumber(matchedDiamond?.price ?? "0");
    const diamondTotal = diamondWeight * diamondRate;

    const baseTotal = metalTotal + diamondTotal + toNumber(row.makingCharge);
    const taxAmount = (baseTotal * toNumber(taxPercentage)) / 100;
    const finalTotal = baseTotal + taxAmount;
    const roundedBaseTotal = toMoney(baseTotal);
    const roundedTaxAmount = toMoney(taxAmount);
    const roundedFinalTotal = toMoney(finalTotal);
    const roundedMetalTotal = toMoney(metalTotal);
    const roundedDiamondTotal = toMoney(diamondTotal);

    const breakupPayload = {
      metalType: row.metalType,
      goldKarat: row.goldKarat,
      diamondQuality: row.diamondQuality,
      diamondColor: row.diamondColor,
      taxPercentage: toMoney(toNumber(taxPercentage)),
      rows: {
        metal: {
          component:
            row.metalType === "gold"
              ? `Gold ${row.goldKarat ? `${row.goldKarat}KT` : ""}`.trim()
              : row.metalType === "silver"
                ? "Silver"
                : "Platinum",
          rate: toMoney(metalRate),
          weight: toMoney(toNumber(row.metalWeight)),
          finalValue: roundedMetalTotal,
        },
        diamond: {
          component:
            row.diamondQuality && row.diamondColor
              ? `${row.diamondQuality} / ${row.diamondColor}`
              : "Diamond",
          rate: toMoney(diamondRate),
          weight: toMoney(diamondWeight),
          finalValue: roundedDiamondTotal,
        },
        making: {
          component: "Making Charges",
          finalValue: toMoney(toNumber(row.makingCharge)),
        },
      },
      totals: {
        subTotal: roundedBaseTotal,
        tax: roundedTaxAmount,
        grandTotal: roundedFinalTotal,
      },
    };

    const existing = updatesByProductId.get(variantLink.parentProductId) ?? [];
    existing.push({ id: variantLink.variantId, price: finalTotal.toFixed(2) });
    updatesByProductId.set(variantLink.parentProductId, existing);
    metafieldsToSet.push({
      ownerId: variantLink.variantId,
      namespace: "app",
      key: "price_breakup",
      type: "json",
      value: JSON.stringify(breakupPayload),
    });
  }

  let updatedVariantCount = 0;
  const syncErrors: string[] = [];
  for (const [productId, variants] of updatesByProductId) {
    const response = await admin.graphql(
      `#graphql
        mutation UpdateVariantPrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              price
            }
            userErrors {
              field
              message
            }
          }
        }`,
      { variables: { productId, variants } },
    );
    const json = (await response.json()) as {
      data?: {
        productVariantsBulkUpdate?: {
          productVariants?: { id: string; price: string }[];
          userErrors?: { field?: string[]; message: string }[];
        };
      };
    };
    const result = json.data?.productVariantsBulkUpdate;
    if (result?.productVariants?.length) {
      updatedVariantCount += result.productVariants.length;
    }
    for (const err of result?.userErrors ?? []) {
      syncErrors.push(err.message);
    }
  }

  if (metafieldsToSet.length > 0) {
    const chunks = chunkArray(metafieldsToSet, 25);
    for (const metafields of chunks) {
      const response = await admin.graphql(
        `#graphql
          mutation SetPriceBreakupMetafields($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                key
              }
              userErrors {
                field
                message
              }
            }
          }`,
        { variables: { metafields } },
      );
      const json = (await response.json()) as {
        data?: {
          metafieldsSet?: {
            userErrors?: { field?: string[]; message: string }[];
          };
        };
      };
      for (const err of json.data?.metafieldsSet?.userErrors ?? []) {
        syncErrors.push(err.message);
      }
    }
  }

  return {
    ok: syncErrors.length === 0,
    updatedVariantCount,
    skippedVariantCount,
    errors: syncErrors,
  };
};

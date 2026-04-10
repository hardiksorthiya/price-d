import { useEffect, useMemo, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import styles from "../../styles/product-pricing.module.css";
import type { action, loader } from "./server";

type ProductFormRow = {
  productId: string;
  metalType: "gold" | "silver" | "platinum";
  goldKarat: "" | "10" | "14" | "18" | "22";
  diamondQuality: string;
  diamondColor: string;
  metalWeight: string;
  diamondCaratWeight: string;
  makingCharge: string;
};

const asNumber = (value: string) => {
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
};

const normalizeText = (value: string) => value.trim().toLowerCase();

export default function ProductPricingPage() {
  const {
    products,
    pricingByProductId,
    pricesByMetal,
    diamondRanges,
    taxPercentage,
    modelReady,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  const initialRows = useMemo<ProductFormRow[]>(
    () =>
      products.map((product) => {
        const pricing = pricingByProductId[product.id];
        return {
          productId: product.id,
          metalType: pricing?.metalType ?? "gold",
          goldKarat: pricing?.goldKarat ?? "22",
          diamondQuality: pricing?.diamondQuality ?? "",
          diamondColor: pricing?.diamondColor ?? "",
          metalWeight: pricing?.metalWeight ?? "",
          diamondCaratWeight: pricing?.diamondCaratWeight ?? "",
          makingCharge: pricing?.makingCharge ?? "",
        };
      }),
    [products, pricingByProductId],
  );

  const [rows, setRows] = useState<ProductFormRow[]>(initialRows);
  useEffect(() => {
    if (!isLoading) setRows(initialRows);
  }, [initialRows, isLoading]);

  useEffect(() => {
    if (!editingProductId && products.length > 0) {
      setEditingProductId(products[0].id);
    }
  }, [editingProductId, products]);

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.ok) {
      const updated = fetcher.data.updatedVariantCount ?? 0;
      const skipped = fetcher.data.skippedVariantCount ?? 0;
      const message =
        skipped > 0
          ? `Saved. Updated ${updated} variant price(s), skipped ${skipped} item(s) without variant link.`
          : `Saved. Updated ${updated} variant price(s).`;
      shopify.toast.show(message);
      setSavedAt(new Date());
      return;
    }

    const firstError =
      fetcher.data.errors?.[0] ??
      "Could not update storefront variant prices. Please try again.";
    shopify.toast.show(firstError, { isError: true });
  }, [fetcher.data, shopify]);

  const uniqueDiamondPairs = useMemo(() => {
    const map = new Map<string, { quality: string; color: string }>();
    for (const row of diamondRanges) {
      const quality = row.diamondQuality?.trim();
      const color = row.diamondColor?.trim();
      if (!quality || !color) continue;
      const key = `${quality}::${color}`;
      if (!map.has(key)) map.set(key, { quality, color });
    }
    return Array.from(map.values());
  }, [diamondRanges]);

  const calculateTotals = (row: ProductFormRow) => {
    const metalRate =
      row.metalType === "gold"
        ? asNumber(pricesByMetal.gold?.[row.goldKarat || "22"] ?? "0")
        : asNumber(pricesByMetal[row.metalType]?.[""] ?? "0");
    const metalWeight = asNumber(row.metalWeight);
    const metalTotal = metalWeight * metalRate;

    const diamondWeight = asNumber(row.diamondCaratWeight);
    const selectedQuality = normalizeText(row.diamondQuality);
    const selectedColor = normalizeText(row.diamondColor);

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

    // Fallback: if quality+color matched but weight range is missing, use first configured price.
    const matchedDiamond = matchedByRange ?? sameQualityColorRanges[0];
    const diamondRate = asNumber(matchedDiamond?.price ?? "0");
    const diamondTotal = diamondWeight * diamondRate;

    const making = asNumber(row.makingCharge);
    const total = metalTotal + diamondTotal + making;
    const taxPct = asNumber(taxPercentage);
    const taxAmount = (total * taxPct) / 100;
    const finalTotal = total + taxAmount;
    return {
      metalRate,
      metalTotal,
      diamondRate,
      diamondTotal,
      making,
      total,
      taxPct,
      taxAmount,
      finalTotal,
    };
  };

  return (
    <s-page heading="Product price">
      <s-button
        slot="primary-action"
        disabled={!modelReady}
        onClick={() =>
          (
            document.getElementById(
              "product-pricing-form",
            ) as HTMLFormElement | null
          )?.requestSubmit()
        }
      >
        {isLoading ? "Saving…" : "Save product prices"}
      </s-button>

      <div className={styles.intro}>
        <p>
          First list shows your inventory items. Click <strong>Edit</strong> on an
          item to set metal weight, diamond weight, and making charge with formula.
          {savedAt && (
            <>
              {" "}
              <span className={styles.savedAt}>
                Saved {savedAt.toLocaleTimeString()}.
              </span>
            </>
          )}
        </p>
      </div>

      {!modelReady && (
        <s-banner tone="critical">
          Product pricing model is not ready. Run <code>npm run setup</code>, then
          restart <code>shopify app dev</code>.
        </s-banner>
      )}

      <fetcher.Form id="product-pricing-form" method="post">
        <input type="hidden" name="product_count" value={rows.length} />

        <div className={styles.table}>
          <div className={styles.headerRow}>
            <div>Inventory item</div>
            <div>SKU / Track</div>
            <div>Saved weights</div>
            <div>Action</div>
          </div>

          {products.map((product, index) => {
            const row = rows[index];
            const totals = calculateTotals(row);
            const isEditing = editingProductId === product.id;
            return (
              <div key={product.id}>
                <input type="hidden" name={`product_id_${index}`} value={product.id} />
                <input
                  type="hidden"
                  name={`variant_id_${index}`}
                  value={product.variantId}
                />
                <input
                  type="hidden"
                  name={`parent_product_id_${index}`}
                  value={product.parentProductId}
                />
                <input type="hidden" name={`metal_type_${index}`} value={row.metalType} />
                <input type="hidden" name={`gold_karat_${index}`} value={row.goldKarat} />
                <input
                  type="hidden"
                  name={`diamond_quality_${index}`}
                  value={row.diamondQuality}
                />
                <input type="hidden" name={`diamond_color_${index}`} value={row.diamondColor} />
                <input type="hidden" name={`metal_weight_${index}`} value={row.metalWeight} />
                <input
                  type="hidden"
                  name={`diamond_carat_weight_${index}`}
                  value={row.diamondCaratWeight}
                />
                <input type="hidden" name={`making_charge_${index}`} value={row.makingCharge} />

                <div className={styles.dataRow}>
                  <div className={styles.productCell}>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className={styles.productImage}
                      />
                    ) : (
                      <div className={styles.productImagePlaceholder}>No image</div>
                    )}
                    <div>
                      <div className={styles.productTitle}>{product.title}</div>
                      <div className={styles.productHandle}>
                        {product.handle ? `/${product.handle}` : "No handle"}
                      </div>
                    </div>
                  </div>

                  <div className={styles.typeCell}>
                    <div>{product.sku || "No SKU"}</div>
                    <div>{product.tracked ? "Tracked" : "Not tracked"}</div>
                  </div>

                  <div className={styles.savedCell}>
                    <div>Metal: {row.metalWeight || "0"} g</div>
                    <div>Diamond: {row.diamondCaratWeight || "0"} ct</div>
                    <div>Total: {totals.finalTotal.toFixed(2)}</div>
                  </div>

                  <div>
                    <s-button
                      type="button"
                      variant={isEditing ? "secondary" : "primary"}
                      onClick={() =>
                        setEditingProductId((curr) =>
                          curr === product.id ? null : product.id,
                        )
                      }
                    >
                      {isEditing ? "Close" : "Edit"}
                    </s-button>
                  </div>
                </div>

                {isEditing && (
                  <div className={styles.editorBox}>
                    <div className={styles.editorGrid}>
                      <div className={styles.field}>
                        <label className={styles.label}>Metal type</label>
                        <select
                          className={styles.select}
                          value={row.metalType}
                          onChange={(e) => {
                            const value = e.currentTarget.value as
                              | "gold"
                              | "silver"
                              | "platinum";
                            setRows((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      metalType: value,
                                      goldKarat:
                                        value === "gold"
                                          ? item.goldKarat || "22"
                                          : "",
                                    }
                                  : item,
                              ),
                            );
                          }}
                        >
                          <option value="gold">Gold</option>
                          <option value="silver">Silver</option>
                          <option value="platinum">Platinum</option>
                        </select>
                      </div>

                      {row.metalType === "gold" && (
                        <div className={styles.field}>
                          <label className={styles.label}>Gold karat</label>
                          <select
                            className={styles.select}
                            value={row.goldKarat}
                            onChange={(e) => {
                              const value = e.currentTarget.value as
                                | ""
                                | "10"
                                | "14"
                                | "18"
                                | "22";
                              setRows((prev) =>
                                prev.map((item, i) =>
                                  i === index ? { ...item, goldKarat: value } : item,
                                ),
                              );
                            }}
                          >
                            <option value="10">10kt</option>
                            <option value="14">14kt</option>
                            <option value="18">18kt</option>
                            <option value="22">22kt</option>
                          </select>
                        </div>
                      )}

                      <div className={styles.field}>
                        <label className={styles.label}>Metal weight (g)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={row.metalWeight}
                          onChange={(e) => {
                            const value = e.currentTarget.value;
                            setRows((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, metalWeight: value } : item,
                              ),
                            );
                          }}
                          className={styles.input}
                          placeholder="0.00"
                        />
                      </div>

                      <div className={styles.field}>
                        <label className={styles.label}>Diamond quality-color</label>
                        <select
                          className={styles.select}
                          value={`${row.diamondQuality}::${row.diamondColor}`}
                          onChange={(e) => {
                            const [quality, color] =
                              e.currentTarget.value.split("::");
                            setRows((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      diamondQuality: quality || "",
                                      diamondColor: color || "",
                                    }
                                  : item,
                              ),
                            );
                          }}
                        >
                          <option value="::">Select quality and color</option>
                          {uniqueDiamondPairs.map((pair) => (
                            <option
                              key={`${pair.quality}-${pair.color}`}
                              value={`${pair.quality}::${pair.color}`}
                            >
                              {pair.quality} - {pair.color}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.field}>
                        <label className={styles.label}>Diamond weight (ct)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={row.diamondCaratWeight}
                          onChange={(e) => {
                            const value = e.currentTarget.value;
                            setRows((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, diamondCaratWeight: value }
                                  : item,
                              ),
                            );
                          }}
                          className={styles.input}
                          placeholder="0.00"
                        />
                      </div>

                      <div className={styles.field}>
                        <label className={styles.label}>Making charge</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={row.makingCharge}
                          onChange={(e) => {
                            const value = e.currentTarget.value;
                            setRows((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, makingCharge: value } : item,
                              ),
                            );
                          }}
                          className={styles.input}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className={styles.formulaBox}>
                      <div>
                        Metal price = {row.metalWeight || 0} *{" "}
                        {totals.metalRate.toFixed(2)} = {totals.metalTotal.toFixed(2)}
                      </div>
                      <div>
                        + Diamond price = {row.diamondCaratWeight || 0} *{" "}
                        {totals.diamondRate.toFixed(2)} ={" "}
                        {totals.diamondTotal.toFixed(2)}
                      </div>
                      <div>+ Making charge = {totals.making.toFixed(2)}</div>
                      <div>
                        + Tax ({totals.taxPct.toFixed(2)}%) ={" "}
                        {totals.taxAmount.toFixed(2)}
                      </div>
                      <div className={styles.formulaTotal}>
                        = Final total price = {totals.finalTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.actionsSticky}>
          <span className={styles.actionsHint}>
            Save updates your pricing data and Shopify storefront prices.
          </span>
          <s-button
            type="button"
            variant="tertiary"
            onClick={() => setRows(initialRows)}
            disabled={isLoading}
          >
            Reset
          </s-button>
          <s-button type="submit" disabled={!modelReady}>
            {isLoading ? "Saving…" : "Save product prices"}
          </s-button>
        </div>
      </fetcher.Form>
    </s-page>
  );
}

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

  const csvHeaders = [
    "productId",
    "sku",
    "productName",
    "attribute",
    "metalType",
    "goldKarat",
    "diamondQuality",
    "diamondColor",
    "metalWeight",
    "diamondCaratWeight",
    "makingCharge",
  ] as const;

  const escapeCsvValue = (value: string) => {
    const normalized = value.replace(/"/g, '""');
    return `"${normalized}"`;
  };

  const buildCsv = (data: ProductFormRow[]) => {
    const headerRow = csvHeaders.join(",");
    const lines = data.map((row) =>
      {
        const product = products.find((p) => p.id === row.productId);
        const fullTitle = product?.title ?? "";
        const titleMatch = fullTitle.match(/^(.*?)\s*\((.*?)\)\s*$/);
        const productName = titleMatch?.[1]?.trim() ?? fullTitle;
        const attribute = titleMatch?.[2]?.trim() ?? "";
        return [
          row.productId,
          product?.sku ?? "",
          productName,
          attribute,
          row.metalType,
          row.goldKarat,
          row.diamondQuality,
          row.diamondColor,
          row.metalWeight,
          row.diamondCaratWeight,
          row.makingCharge,
        ]
          .map((value) => escapeCsvValue(String(value ?? "")))
          .join(",");
      },
    );
    return [headerRow, ...lines].join("\n");
  };

  const downloadCsv = (filename: string, data: ProductFormRow[]) => {
    const csv = buildCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map((cell) => cell.trim());
  };

  const handleExportTemplate = () => {
    const templateRows = products.map((product) => ({
      productId: product.id,
      metalType: "gold" as const,
      goldKarat: "22" as const,
      diamondQuality: "",
      diamondColor: "",
      metalWeight: "",
      diamondCaratWeight: "",
      makingCharge: "",
    }));
    downloadCsv("product-pricing-template.csv", templateRows);
  };

  const handleExportCurrent = () => {
    downloadCsv("product-pricing-current.csv", rows);
  };

  const handleImportCsv = async (file: File) => {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      shopify.toast.show("CSV is empty or missing data rows.", { isError: true });
      return;
    }

    const header = parseCsvLine(lines[0]);
    const requiredHeaders = Array.from(csvHeaders);
    const hasAllHeaders = requiredHeaders
      .filter((h) => !["sku", "productName", "attribute"].includes(h))
      .every((h) => header.includes(h));
    if (!hasAllHeaders) {
      shopify.toast.show("Invalid CSV format. Please use exported template.", {
        isError: true,
      });
      return;
    }

    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    const importedByProductId = new Map<string, ProductFormRow>();
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      const productId = cells[idx.productId] ?? "";
      if (!productId) continue;

      const metalRaw = (cells[idx.metalType] ?? "").toLowerCase();
      const metalType: ProductFormRow["metalType"] =
        metalRaw === "silver" || metalRaw === "platinum" ? metalRaw : "gold";
      const karatRaw = cells[idx.goldKarat] ?? "";
      const goldKarat: ProductFormRow["goldKarat"] =
        karatRaw === "10" ||
        karatRaw === "14" ||
        karatRaw === "18" ||
        karatRaw === "22"
          ? karatRaw
          : metalType === "gold"
            ? "22"
            : "";

      importedByProductId.set(productId, {
        productId,
        metalType,
        goldKarat,
        diamondQuality: cells[idx.diamondQuality] ?? "",
        diamondColor: cells[idx.diamondColor] ?? "",
        metalWeight: cells[idx.metalWeight] ?? "",
        diamondCaratWeight: cells[idx.diamondCaratWeight] ?? "",
        makingCharge: cells[idx.makingCharge] ?? "",
      });
    }

    let appliedCount = 0;
    setRows((prev) =>
      prev.map((row) => {
        const imported = importedByProductId.get(row.productId);
        if (!imported) return row;
        appliedCount += 1;
        return imported;
      }),
    );
    shopify.toast.show(`Imported pricing for ${appliedCount} product(s).`);
  };
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
    <div className="container-fluid app-page-container">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
          <div className="app-page-header app-page-header-bar">
        <h2 className="app-page-title">Product price</h2>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleExportTemplate}
          >
            Export template
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleExportCurrent}
          >
            Export current
          </button>
          <label className="btn btn-outline-secondary mb-0">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0];
                if (!file) return;
                await handleImportCsv(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <button
            className="btn btn-primary"
            disabled={!modelReady}
            onClick={() =>
              (
                document.getElementById(
                  "product-pricing-form",
                ) as HTMLFormElement | null
              )?.requestSubmit()
            }
          >
            {isLoading ? "Saving..." : "Save product prices"}
          </button>
        </div>
      </div>
          </div>
        </div>
      </div>
      

      <div className="container-fluid">
        <div className="row g-3">
          <div className="col-12">
            <div className="card shadow-sm app-main-card">
              <div className="card-body">
                <div className={styles.intro}>
                  <p>
                    First list shows your inventory items. Click <strong>Edit</strong>{" "}
                    on an item to set metal weight, diamond weight, and making
                    charge with formula.
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
                  <div className="alert alert-danger py-2" role="alert">
                    Product pricing model is not ready. Run{" "}
                    <code>npm run setup</code>, then restart{" "}
                    <code>shopify app dev</code>.
                  </div>
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
                    <button
                      type="button"
                      className={`btn btn-sm ${isEditing ? "btn-outline-secondary" : "btn-primary"}`}
                      onClick={() =>
                        setEditingProductId((curr) =>
                          curr === product.id ? null : product.id,
                        )
                      }
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>
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
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setRows(initialRows)}
                      disabled={isLoading}
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={!modelReady}
                    >
                      {isLoading ? "Saving..." : "Save product prices"}
                    </button>
                  </div>
                </fetcher.Form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

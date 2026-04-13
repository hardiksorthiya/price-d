import { useEffect, useMemo, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import styles from "../../styles/pricing.module.css";
import { GOLD_KARATS } from "./constants";
import type { action, loader } from "./server";
import { buildInitialFormState, createDefaultDiamondRange } from "./utils";

export default function PricingPage() {
  const { prices, diamondRanges, taxPercentage, modelReady } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  const initialState = useMemo(
    () => buildInitialFormState(prices, diamondRanges, taxPercentage),
    [prices, diamondRanges, taxPercentage],
  );

  const [formState, setFormState] = useState(initialState);
  useEffect(() => {
    if (!isLoading) setFormState(initialState);
  }, [initialState, isLoading]);

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Prices saved");
      setSavedAt(new Date());
    }
  }, [fetcher.data?.ok, shopify]);

  return (
    <div className="container-fluid app-page-container">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
          <div className="app-page-header app-page-header-bar">
        <h2 className="app-page-title">Price distribution</h2>
        <button
          className="btn btn-primary"
          disabled={!modelReady}
          onClick={() =>
            (
              document.getElementById("pricing-form") as HTMLFormElement | null
            )?.requestSubmit()
          }
        >
          {isLoading ? "Saving..." : "Save prices"}
        </button>
      </div>
          </div>
        </div>
      </div>
      

      <div className="container-fluid">
        <div className="row g-3">
          <div className="col-12 col-xxl-9">
            <div className="card shadow-sm app-main-card">
              <div className="card-body">
                {!modelReady && (
                  <div className="alert alert-danger py-2" role="alert">
                    Stop the dev server, run <code>npx prisma generate</code>, then
                    start <code>shopify app dev</code> again so prices can be saved.
                  </div>
                )}

                <div className={styles.intro}>
                  <p>
                    Set your metal prices per unit (e.g. per gram). Gold uses
                    karat tiers; silver and platinum use a single rate.
                    {savedAt && (
                      <>
                        {" "}
                        <span style={{ color: "var(--p-color-text, #202223)" }}>
                          Saved {savedAt.toLocaleTimeString()}.
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <fetcher.Form id="pricing-form" method="post">
                  <div>
                    <h4 className="h6 mb-3">Metals</h4>
          <div className={`${styles.card} ${styles.cardGold}`}>
            <p className={styles.cardTitle}>
              <span className={styles.badgeGold}>Gold</span>
            </p>
            <p className={styles.cardSubtitle}>Price per unit for each karat</p>
            <div className={styles.karatGrid}>
              {GOLD_KARATS.map((k) => (
                <div key={k} className={styles.field}>
                  <label htmlFor={`gold_${k}`} className={styles.fieldLabel}>
                    {k}kt
                  </label>
                  <input
                    id={`gold_${k}`}
                    type="number"
                    name={`gold_${k}`}
                    value={formState.gold[String(k) as "10" | "14" | "18" | "22"]}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setFormState((s) => ({
                        ...s,
                        gold: { ...s.gold, [String(k)]: value },
                      }));
                    }}
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                    className={styles.input}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.card} ${styles.cardSilver}`}>
            <p className={styles.cardTitle}>
              <span className={styles.badgeSilver}>Silver</span>
            </p>
            <p className={styles.cardSubtitle}>Price per unit</p>
            <div className={`${styles.field} ${styles.singleField}`}>
              <label htmlFor="silver" className={styles.fieldLabel}>
                Silver price
              </label>
              <input
                id="silver"
                type="number"
                name="silver"
                value={formState.silver}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setFormState((s) => ({ ...s, silver: value }));
                }}
                placeholder="0.00"
                min={0}
                step="0.01"
                className={styles.input}
              />
            </div>
          </div>

          <div className={`${styles.card} ${styles.cardPlatinum}`}>
            <p className={styles.cardTitle}>
              <span className={styles.badgePlatinum}>Platinum</span>
            </p>
            <p className={styles.cardSubtitle}>Price per unit</p>
            <div className={`${styles.field} ${styles.singleField}`}>
              <label htmlFor="platinum" className={styles.fieldLabel}>
                Platinum price
              </label>
              <input
                id="platinum"
                type="number"
                name="platinum"
                value={formState.platinum}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setFormState((s) => ({ ...s, platinum: value }));
                }}
                placeholder="0.00"
                min={0}
                step="0.01"
                className={styles.input}
              />
            </div>
          </div>

          <div className={`${styles.card} ${styles.cardDiamond}`}>
            <p className={styles.cardTitle}>
              <span className={styles.badgeDiamond}>Diamond</span>
            </p>
            <p className={styles.cardSubtitle}>
              Set price by quality, color, and carat range (min–max).
            </p>

            <input
              type="hidden"
              name="diamond_count"
              value={formState.diamond.length}
            />

            <div className={styles.rangeHeader}>
              <div>Diamond quality</div>
              <div>Diamond color</div>
              <div>Min carat</div>
              <div>Max carat</div>
              <div>Price</div>
              <div></div>
            </div>

            {formState.diamond.map((r, idx) => (
              <div key={idx} className={styles.rangeRow}>
                <div className={styles.field}>
                  <label
                    className={styles.fieldLabel}
                    htmlFor={`diamond_quality_${idx}`}
                  >
                    Quality
                  </label>
                  <input
                    id={`diamond_quality_${idx}`}
                    name={`diamond_quality_${idx}`}
                    type="text"
                    value={r.diamondQuality}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setFormState((s) => ({
                        ...s,
                        diamond: s.diamond.map((x, i) =>
                          i === idx ? { ...x, diamondQuality: value } : x,
                        ),
                      }));
                    }}
                    placeholder="e.g. VVS1"
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label
                    className={styles.fieldLabel}
                    htmlFor={`diamond_color_${idx}`}
                  >
                    Color
                  </label>
                  <input
                    id={`diamond_color_${idx}`}
                    name={`diamond_color_${idx}`}
                    type="text"
                    value={r.diamondColor}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setFormState((s) => ({
                        ...s,
                        diamond: s.diamond.map((x, i) =>
                          i === idx ? { ...x, diamondColor: value } : x,
                        ),
                      }));
                    }}
                    placeholder="e.g. D"
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label
                    className={styles.fieldLabel}
                    htmlFor={`diamond_min_${idx}`}
                  >
                    Min
                  </label>
                  <input
                    id={`diamond_min_${idx}`}
                    name={`diamond_min_${idx}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={r.minCarat}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setFormState((s) => ({
                        ...s,
                        diamond: s.diamond.map((x, i) =>
                          i === idx ? { ...x, minCarat: value } : x,
                        ),
                      }));
                    }}
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label
                    className={styles.fieldLabel}
                    htmlFor={`diamond_max_${idx}`}
                  >
                    Max
                  </label>
                  <input
                    id={`diamond_max_${idx}`}
                    name={`diamond_max_${idx}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={r.maxCarat}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setFormState((s) => ({
                        ...s,
                        diamond: s.diamond.map((x, i) =>
                          i === idx ? { ...x, maxCarat: value } : x,
                        ),
                      }));
                    }}
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label
                    className={styles.fieldLabel}
                    htmlFor={`diamond_price_${idx}`}
                  >
                    Price
                  </label>
                  <input
                    id={`diamond_price_${idx}`}
                    name={`diamond_price_${idx}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={r.price}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setFormState((s) => ({
                        ...s,
                        diamond: s.diamond.map((x, i) =>
                          i === idx ? { ...x, price: value } : x,
                        ),
                      }));
                    }}
                    className={styles.input}
                  />
                </div>

                <div className={styles.rangeActions}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={formState.diamond.length <= 1}
                    onClick={() =>
                      setFormState((s) => ({
                        ...s,
                        diamond: s.diamond.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() =>
                setFormState((s) => ({
                  ...s,
                  diamond: [...s.diamond, createDefaultDiamondRange()],
                }))
              }
            >
              Add range
            </button>
          </div>

          <div className={`${styles.card} ${styles.cardTax}`}>
            <p className={styles.cardTitle}>
              <span className={styles.badgeTax}>Tax Percentage</span>
            </p>
            <p className={styles.cardSubtitle}>
              Enter tax percentage to apply on product total price.
            </p>
            <div className={`${styles.field} ${styles.singleField}`}>
              <label htmlFor="tax_percentage" className={styles.fieldLabel}>
                Tax %
              </label>
              <input
                id="tax_percentage"
                type="number"
                name="tax_percentage"
                value={formState.taxPercentage}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setFormState((s) => ({ ...s, taxPercentage: value }));
                }}
                placeholder="e.g. 3"
                min={0}
                step="0.01"
                className={styles.input}
              />
            </div>
          </div>
                  </div>

                  <div className={styles.actionsBar}>
                    <span className={styles.actionsHint}>
                      Tip: You can leave fields blank to clear them.
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setFormState(initialState)}
                      disabled={isLoading}
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={!modelReady}
                    >
                      {isLoading ? "Saving..." : "Save prices"}
                    </button>
                  </div>
                </fetcher.Form>
              </div>
            </div>
          </div>

          <div className="col-12 col-xxl-3">
            <div className="card shadow-sm app-side-card">
              <div className="card-body">
                <h5 className="card-title app-section-title">How it works</h5>
                <div className={styles.howItWorks}>
                  <p>
                    Configure base prices for <strong>Gold</strong> (10kt, 14kt,
                    18kt, 22kt), <strong>Silver</strong>, and{" "}
                    <strong>Platinum</strong>. Use these later to calculate
                    product or variant prices (e.g. by weight).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

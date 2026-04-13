import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import {
  PLAN_CONFIG,
  getActiveSubscription,
  getPlanBySubscriptionName,
  getShopPlanInfo,
  type PlanKey,
} from "../lib/billing.server";

const plans = [
  {
    id: "free",
    title: "Free Plan - Dev",
    price: "$0/month",
    limit: "Only for development stores",
    tone: "muted",
    features: [
      "All features available for development testing",
      "Plan and pricing setup verification",
      "Theme extension testing",
      "No live merchant billing",
    ],
    limitations: [
      "Not for live stores",
      "No production SLA/support guarantees",
    ],
  },
  {
    id: "basic",
    title: "Basic Plan - Starter",
    price: "$9/month",
    limit: "Up to 500 product variants",
    tone: "dark",
    features: [
      "Price breakup (Gold / Silver / Diamond)",
      "Fixed formula setup",
      "Apply pricing on up to 500 variants",
      "Basic product page display",
      "Email support",
    ],
    limitations: [
      "Max 500 variants",
      "No advanced dynamic rules",
      "No bulk advanced logic",
    ],
  },
  {
    id: "advanced",
    title: "Advanced Plan - Growth",
    price: "$19/month",
    limit: "Up to 5,000 variants",
    tone: "primary",
    features: [
      "Advanced breakup (Metal + Making + GST)",
      "Dynamic pricing based on weight",
      "Variant-wise calculation",
      "Bulk product support",
      "Custom UI",
      "Priority support",
    ],
    limitations: ["Max 5,000 variants"],
  },
  {
    id: "premium",
    title: "Premium Plan - Pro",
    price: "$39/month",
    limit: "Unlimited variants",
    tone: "success",
    features: [
      "Unlimited variants",
      "Real-time pricing logic",
      "API-based metal rates",
      "Custom rules",
      "Multi-currency",
      "Full customization",
      "Priority + WhatsApp support",
    ],
    limitations: [],
  },
] as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const activeSubscription = await getActiveSubscription(admin);
  const shopPlan = await getShopPlanInfo(admin);
  const activePlan: PlanKey = activeSubscription
    ? getPlanBySubscriptionName(activeSubscription.name)
    : "free";
  return {
    activePlan,
    activeSubscriptionId: activeSubscription?.id ?? null,
    isDevelopmentStore: shopPlan.partnerDevelopment,
    shopPlanName: shopPlan.displayName,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "cancel") {
    const subscriptionId = String(formData.get("subscriptionId") ?? "");
    if (!subscriptionId) return { ok: false, error: "Missing subscription id." };
    const cancelResponse = await admin.graphql(
      `#graphql
        mutation CancelPlan($id: ID!) {
          appSubscriptionCancel(id: $id, prorate: false) {
            appSubscription {
              id
              status
            }
            userErrors {
              field
              message
            }
          }
        }`,
      { variables: { id: subscriptionId } },
    );
    const cancelJson = (await cancelResponse.json()) as {
      data?: {
        appSubscriptionCancel?: {
          userErrors?: { message: string }[];
        };
      };
    };
    const errors = cancelJson.data?.appSubscriptionCancel?.userErrors ?? [];
    if (errors.length > 0) return { ok: false, error: errors[0].message };
    return { ok: true };
  }

  const plan = String(formData.get("plan") ?? "") as keyof typeof PLAN_CONFIG;
  if (!PLAN_CONFIG[plan]) return { ok: false, error: "Invalid plan selected." };
  const selectedPlan = PLAN_CONFIG[plan];

  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const createResponse = await admin.graphql(
    `#graphql
      mutation CreatePlan($name: String!, $returnUrl: URL!, $price: Decimal!) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          test: ${process.env.NODE_ENV !== "production" ? "true" : "false"}
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  interval: EVERY_30_DAYS
                  price: { amount: $price, currencyCode: USD }
                }
              }
            }
          ]
        ) {
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        name: selectedPlan.name,
        returnUrl: `${appUrl}/app/plans`,
        price: selectedPlan.amount,
      },
    },
  );
  const createJson = (await createResponse.json()) as {
    data?: {
      appSubscriptionCreate?: {
        confirmationUrl?: string;
        userErrors?: { message: string }[];
      };
    };
  };
  const errors = createJson.data?.appSubscriptionCreate?.userErrors ?? [];
  if (errors.length > 0) return { ok: false, error: errors[0].message };
  const confirmationUrl = createJson.data?.appSubscriptionCreate?.confirmationUrl;
  if (!confirmationUrl) return { ok: false, error: "Missing confirmation URL." };
  return Response.redirect(confirmationUrl, 302);
};

export default function PlansPage() {
  const { activePlan, activeSubscriptionId, isDevelopmentStore, shopPlanName } =
    useLoaderData<typeof loader>();
  return (
    <div className="container-fluid app-page-container">
      <div className="app-page-header app-page-header-bar">
        <h2 className="app-page-title">Pricing Plans</h2>
      </div>

      <div className="card shadow-sm app-main-card mb-3">
        <div className="card-body">
          <p className="mb-0 app-muted-text">
            Choose the right plan for your store. This page shows the commercial
            structure for live launch and merchant onboarding.
          </p>
          {!isDevelopmentStore && activePlan === "free" && (
            <div className="alert alert-warning mt-3 mb-0 py-2" role="alert">
              Your store is currently on <strong>{shopPlanName}</strong>. Free
              plan is only for development stores. Please select a paid plan to
              continue using pricing updates on live stores.
            </div>
          )}
        </div>
      </div>

      <div className="row g-3">
        {plans.map((plan) => (
          <div className="col-12 col-md-6 col-xxl-3" key={plan.id}>
            <div
              className={`card h-100 shadow-sm app-side-card plan-card ${
                plan.id === "advanced" ? "plan-card-featured" : ""
              } ${activePlan === plan.id ? "plan-card-current" : ""}`}
            >
              <div className="card-body d-flex flex-column">
                <div className="mb-2 d-flex align-items-center justify-content-between gap-2">
                  <span className={`badge text-bg-${plan.tone}`}>{plan.title}</span>
                  {plan.id === "advanced" && (
                    <span className="badge text-bg-warning">Most Popular</span>
                  )}
                </div>
                <h4 className="h5 mb-1 plan-price">{plan.price}</h4>
                <p className="small app-muted-text mb-3">{plan.limit}</p>
                {activePlan === plan.id && (
                  <span className="badge text-bg-success mb-2">Current plan</span>
                )}

                <h6 className="mb-2">Features</h6>
                <ul className="small ps-3 mb-3 plan-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                {plan.limitations.length > 0 && (
                  <>
                    <h6 className="mb-2">Limitations</h6>
                    <ul className="small ps-3 mb-0 plan-list plan-list-danger">
                      {plan.limitations.map((limitation) => (
                        <li key={limitation}>{limitation}</li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="mt-auto pt-3">
                  {plan.id !== "free" && activePlan !== plan.id && (
                    <Form method="post">
                      <input type="hidden" name="intent" value="subscribe" />
                      <input type="hidden" name="plan" value={plan.id} />
                      <button type="submit" className="btn btn-primary btn-sm w-100">
                        Choose {plan.title}
                      </button>
                    </Form>
                  )}
                  {plan.id !== "free" &&
                    activePlan === plan.id &&
                    activeSubscriptionId && (
                      <Form method="post">
                        <input type="hidden" name="intent" value="cancel" />
                        <input
                          type="hidden"
                          name="subscriptionId"
                          value={activeSubscriptionId}
                        />
                        <button type="submit" className="btn btn-outline-danger btn-sm w-100">
                          Cancel plan
                        </button>
                      </Form>
                    )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

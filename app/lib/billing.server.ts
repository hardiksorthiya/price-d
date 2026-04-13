export type PlanKey = "free" | "basic" | "advanced" | "premium";

type ActiveSubscription = {
  id: string;
  name: string;
  status: string;
};

type ShopPlanInfo = {
  partnerDevelopment: boolean;
  displayName: string;
};

export const PLAN_CONFIG: Record<
  Exclude<PlanKey, "free">,
  { name: string; amount: number; variantLimit: number | null }
> = {
  basic: {
    name: "Basic Plan - Starter",
    amount: 9,
    variantLimit: 500,
  },
  advanced: {
    name: "Advanced Plan - Growth",
    amount: 19,
    variantLimit: 5000,
  },
  premium: {
    name: "Premium Plan - Pro",
    amount: 39,
    variantLimit: null,
  },
};

export const getPlanBySubscriptionName = (name: string): PlanKey => {
  const normalized = name.toLowerCase();
  if (normalized.includes("premium")) return "premium";
  if (normalized.includes("advanced")) return "advanced";
  if (normalized.includes("basic")) return "basic";
  return "free";
};

export const getVariantLimitByPlan = (plan: PlanKey): number | null => {
  if (plan === "premium") return null;
  if (plan === "advanced") return 5000;
  if (plan === "basic") return 500;
  return null;
};

export const getShopPlanInfo = async (admin: {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
}) => {
  const response = await admin.graphql(
    `#graphql
      query ShopPlanInfo {
        shop {
          plan {
            partnerDevelopment
            displayName
          }
        }
      }`,
  );
  const json = (await response.json()) as {
    data?: {
      shop?: {
        plan?: ShopPlanInfo | null;
      };
    };
  };
  return (
    json.data?.shop?.plan ?? {
      partnerDevelopment: false,
      displayName: "Unknown",
    }
  );
};

export const getActiveSubscription = async (admin: {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
}) => {
  const response = await admin.graphql(
    `#graphql
      query CurrentAppSubscriptions {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
          }
        }
      }`,
  );
  const json = (await response.json()) as {
    data?: {
      currentAppInstallation?: {
        activeSubscriptions?: ActiveSubscription[];
      };
    };
  };
  const subscriptions = json.data?.currentAppInstallation?.activeSubscriptions ?? [];
  const active = subscriptions.find((sub) => sub.status === "ACTIVE");
  return active ?? null;
};

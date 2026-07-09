import { getSubscriptionSettings } from "@/lib/subscription-settings";

export type PlanId = "starter" | "growth" | "scale";

export type Plan = {
  id: PlanId;
  name: string;
  accountLimit: number;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyPerMonth: number;
  zernioCostMonthly: number;
  estimatedMarginPercent: number;
  popular?: boolean;
  description: string;
  features: string[];
};

export const DEFAULT_SUBSCRIPTION_MARGIN_PERCENT = 80;

/**
 * Zernio usage-based platform cost (per their public pricing tiers):
 * - First 2 accounts: free
 * - Accounts 3–10: $6/account
 * - Accounts 11–100: $3/account
 * - Accounts 101–2,000: $1/account
 */
export function zernioMonthlyPlatformCost(accountCount: number): number {
  if (accountCount <= 2) return 0;

  let cost = 0;
  const tier3to10 = Math.max(0, Math.min(accountCount, 10) - 2);
  cost += tier3to10 * 6;

  const tier11to100 = Math.max(0, Math.min(accountCount, 100) - 10);
  cost += tier11to100 * 3;

  const tier101to2000 = Math.max(0, Math.min(accountCount, 2000) - 100);
  cost += tier101to2000 * 1;

  return cost;
}

function priceForMargin(zernioCost: number, floor: number, marginPercent: number): number {
  if (zernioCost <= 0) return floor;
  const margin = Math.min(99, Math.max(0, marginPercent)) / 100;
  if (margin >= 1) return floor;
  const target = Math.ceil(zernioCost / (1 - margin));
  return Math.max(target, floor);
}

function calcMarginPercent(price: number, cost: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 100);
}

function yearlyFromMonthly(monthly: number) {
  const yearly = Math.round(monthly * 12 * 0.82);
  return {
    yearly,
    yearlyPerMonth: Math.round(yearly / 12),
  };
}

export function buildPlans(marginPercent = DEFAULT_SUBSCRIPTION_MARGIN_PERCENT): Plan[] {
  const starterCost = zernioMonthlyPlatformCost(3);
  const growthCost = zernioMonthlyPlatformCost(10);
  const scaleCost = zernioMonthlyPlatformCost(25);

  const starterMonthly = priceForMargin(starterCost, 49, marginPercent);
  const growthMonthly = priceForMargin(growthCost, 249, marginPercent);
  const scaleMonthly = priceForMargin(scaleCost, 499, marginPercent);

  const starterYearly = yearlyFromMonthly(starterMonthly);
  const growthYearly = yearlyFromMonthly(growthMonthly);
  const scaleYearly = yearlyFromMonthly(scaleMonthly);

  return [
    {
      id: "starter",
      name: "Starter",
      accountLimit: 3,
      monthlyPrice: starterMonthly,
      yearlyPrice: starterYearly.yearly,
      yearlyPerMonth: starterYearly.yearlyPerMonth,
      zernioCostMonthly: starterCost,
      estimatedMarginPercent: calcMarginPercent(starterMonthly, starterCost),
      description: "Solo creators and new online sellers",
      features: [
        "Up to 3 social accounts",
        "Post scheduling & drafts",
        "Basic analytics",
        "Unified inbox (comments + DMs)",
        "USDT / PayPal / GCash billing",
      ],
    },
    {
      id: "growth",
      name: "Growth",
      accountLimit: 10,
      monthlyPrice: growthMonthly,
      yearlyPrice: growthYearly.yearly,
      yearlyPerMonth: growthYearly.yearlyPerMonth,
      zernioCostMonthly: growthCost,
      estimatedMarginPercent: calcMarginPercent(growthMonthly, growthCost),
      popular: true,
      description: "Agencies and growing brands",
      features: [
        "Up to 10 social accounts",
        "Multi-platform publishing",
        "Advanced analytics dashboard",
        "Keyword auto-replies",
        "Priority support tickets",
      ],
    },
    {
      id: "scale",
      name: "Scale",
      accountLimit: 25,
      monthlyPrice: scaleMonthly,
      yearlyPrice: scaleYearly.yearly,
      yearlyPerMonth: scaleYearly.yearlyPerMonth,
      zernioCostMonthly: scaleCost,
      estimatedMarginPercent: calcMarginPercent(scaleMonthly, scaleCost),
      description: "High-volume teams and resellers",
      features: [
        "Up to 25 social accounts",
        "Automation workflows",
        "Team workspaces",
        "Webhook integrations",
        "Dedicated support channel",
      ],
    },
  ];
}

/** Static fallback at default margin — prefer getActivePlans() for live prices. */
export const plans = buildPlans(DEFAULT_SUBSCRIPTION_MARGIN_PERCENT);

export async function getActivePlans(): Promise<Plan[]> {
  const { subscriptionProfitMarginPercent } = await getSubscriptionSettings();
  return buildPlans(subscriptionProfitMarginPercent);
}

export async function getActivePlanById(id: string | null | undefined): Promise<Plan> {
  const list = await getActivePlans();
  return list.find((p) => p.id === id) ?? list[1];
}

export function getPlanById(id: string | null | undefined): Plan {
  return plans.find((p) => p.id === id) ?? plans[1];
}

/** Extra usage fees from provider (pass-through or markup separately) */
export const usageFees = {
  postOrDm: 0.015,
  postWithUrl: 0.2,
  note: "Heavy API usage (posts, DMs) can be billed as overage or bundled into higher tiers.",
};

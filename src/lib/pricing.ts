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

const TARGET_MARGIN = 0.8;

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

function priceFor80PercentMargin(zernioCost: number, floor: number): number {
  if (zernioCost <= 0) return floor;
  const target = Math.ceil(zernioCost / (1 - TARGET_MARGIN));
  return Math.max(target, floor);
}

function marginPercent(price: number, cost: number): number {
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

const starterCost = zernioMonthlyPlatformCost(3);
const growthCost = zernioMonthlyPlatformCost(10);
const scaleCost = zernioMonthlyPlatformCost(25);

const starterMonthly = priceFor80PercentMargin(starterCost, 49);
const growthMonthly = priceFor80PercentMargin(growthCost, 249);
const scaleMonthly = priceFor80PercentMargin(scaleCost, 499);

const starterYearly = yearlyFromMonthly(starterMonthly);
const growthYearly = yearlyFromMonthly(growthMonthly);
const scaleYearly = yearlyFromMonthly(scaleMonthly);

export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    accountLimit: 3,
    monthlyPrice: starterMonthly,
    yearlyPrice: starterYearly.yearly,
    yearlyPerMonth: starterYearly.yearlyPerMonth,
    zernioCostMonthly: starterCost,
    estimatedMarginPercent: marginPercent(starterMonthly, starterCost),
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
    estimatedMarginPercent: marginPercent(growthMonthly, growthCost),
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
    estimatedMarginPercent: marginPercent(scaleMonthly, scaleCost),
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

export function getPlanById(id: string | null | undefined): Plan {
  return plans.find((p) => p.id === id) ?? plans[1];
}

/** Extra usage fees from provider (pass-through or markup separately) */
export const usageFees = {
  postOrDm: 0.015,
  postWithUrl: 0.2,
  note: "Heavy API usage (posts, DMs) can be billed as overage or bundled into higher tiers.",
};

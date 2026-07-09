import { prisma } from "@/lib/prisma";

export type SubscriptionSettingsData = {
  subscriptionProfitMarginPercent: number;
};

const DEFAULTS: SubscriptionSettingsData = {
  subscriptionProfitMarginPercent: 80,
};

export async function getSubscriptionSettings(): Promise<SubscriptionSettingsData> {
  try {
    const row = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
    return {
      subscriptionProfitMarginPercent:
        row?.subscriptionProfitMarginPercent ?? DEFAULTS.subscriptionProfitMarginPercent,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function updateSubscriptionSettings(
  input: Partial<SubscriptionSettingsData>,
): Promise<SubscriptionSettingsData> {
  const current = await getSubscriptionSettings();
  const next = {
    subscriptionProfitMarginPercent: Math.min(
      99,
      Math.max(0, input.subscriptionProfitMarginPercent ?? current.subscriptionProfitMarginPercent),
    ),
  };
  await prisma.integrationSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...next },
    update: next,
  });
  return next;
}

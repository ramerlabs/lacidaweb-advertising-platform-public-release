import { prisma } from "@/lib/prisma";

export type AdsSettingsData = {
  adsEnabled: boolean;
  adsProfitMarginPercent: number;
  adWalletTopUpUsd: number;
};

const DEFAULTS: AdsSettingsData = {
  adsEnabled: true,
  adsProfitMarginPercent: 30,
  adWalletTopUpUsd: 25,
};

export async function getAdsSettings(): Promise<AdsSettingsData> {
  try {
    const row = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
    return {
      adsEnabled: row?.adsEnabled ?? DEFAULTS.adsEnabled,
      adsProfitMarginPercent: row?.adsProfitMarginPercent ?? DEFAULTS.adsProfitMarginPercent,
      adWalletTopUpUsd: row?.adWalletTopUpUsd ?? DEFAULTS.adWalletTopUpUsd,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function updateAdsSettings(input: Partial<AdsSettingsData>): Promise<AdsSettingsData> {
  const current = await getAdsSettings();
  const next = {
    adsEnabled: input.adsEnabled ?? current.adsEnabled,
    adsProfitMarginPercent: Math.min(
      99,
      Math.max(0, input.adsProfitMarginPercent ?? current.adsProfitMarginPercent),
    ),
    adWalletTopUpUsd: input.adWalletTopUpUsd ?? current.adWalletTopUpUsd,
  };
  await prisma.integrationSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...next },
    update: next,
  });
  return next;
}

import { prisma } from "@/lib/prisma";

export type AdsSettingsData = {
  adsEnabled: boolean;
  adsProfitMarginPercent: number;
};

const DEFAULTS: AdsSettingsData = {
  adsEnabled: true,
  adsProfitMarginPercent: 80,
};

export async function getAdsSettings(): Promise<AdsSettingsData> {
  try {
    const row = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
    return {
      adsEnabled: row?.adsEnabled ?? DEFAULTS.adsEnabled,
      adsProfitMarginPercent: row?.adsProfitMarginPercent ?? DEFAULTS.adsProfitMarginPercent,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function updateAdsSettings(input: Partial<AdsSettingsData>): Promise<AdsSettingsData> {
  const current = await getAdsSettings();
  const next = {
    adsEnabled: input.adsEnabled ?? current.adsEnabled,
    adsProfitMarginPercent: input.adsProfitMarginPercent ?? current.adsProfitMarginPercent,
  };
  await prisma.integrationSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...next },
    update: next,
  });
  return next;
}

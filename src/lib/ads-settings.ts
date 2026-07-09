import { prisma } from "@/lib/prisma";
import type { PublisherAdServingMode as PrismaPublisherAdServingMode } from "@prisma/client";

export type PublisherAdServingMode = "ROTATE_ALL" | "PERSONALIZED";

export type AdsSettingsData = {
  adsEnabled: boolean;
  adsProfitMarginPercent: number;
  adWalletTopUpUsd: number;
  publisherAdServingMode: PublisherAdServingMode;
  publisherAdRotateSeconds: number;
  publisherAutoAdsEnabled: boolean;
};

const DEFAULTS: AdsSettingsData = {
  adsEnabled: true,
  adsProfitMarginPercent: 0,
  adWalletTopUpUsd: 25,
  publisherAdServingMode: "ROTATE_ALL",
  publisherAdRotateSeconds: 8,
  publisherAutoAdsEnabled: true,
};

export async function getAdsSettings(): Promise<AdsSettingsData> {
  try {
    const row = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
    return {
      adsEnabled: row?.adsEnabled ?? DEFAULTS.adsEnabled,
      adsProfitMarginPercent: row?.adsProfitMarginPercent ?? DEFAULTS.adsProfitMarginPercent,
      adWalletTopUpUsd: row?.adWalletTopUpUsd ?? DEFAULTS.adWalletTopUpUsd,
      publisherAdServingMode:
        row?.publisherAdServingMode === "PERSONALIZED" ? "PERSONALIZED" : "ROTATE_ALL",
      publisherAdRotateSeconds: row?.publisherAdRotateSeconds ?? DEFAULTS.publisherAdRotateSeconds,
      publisherAutoAdsEnabled: row?.publisherAutoAdsEnabled ?? DEFAULTS.publisherAutoAdsEnabled,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function updateAdsSettings(input: Partial<AdsSettingsData>): Promise<AdsSettingsData> {
  const current = await getAdsSettings();
  const next: AdsSettingsData = {
    adsEnabled: input.adsEnabled ?? current.adsEnabled,
    adsProfitMarginPercent: Math.min(
      99,
      Math.max(0, input.adsProfitMarginPercent ?? current.adsProfitMarginPercent),
    ),
    adWalletTopUpUsd: input.adWalletTopUpUsd ?? current.adWalletTopUpUsd,
    publisherAdServingMode:
      input.publisherAdServingMode === "PERSONALIZED" ? "PERSONALIZED" : "ROTATE_ALL",
    publisherAdRotateSeconds: Math.min(
      120,
      Math.max(0, input.publisherAdRotateSeconds ?? current.publisherAdRotateSeconds),
    ),
    publisherAutoAdsEnabled: input.publisherAutoAdsEnabled ?? current.publisherAutoAdsEnabled,
  };
  const prismaMode: PrismaPublisherAdServingMode = next.publisherAdServingMode;
  await prisma.integrationSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...next, publisherAdServingMode: prismaMode },
    update: { ...next, publisherAdServingMode: prismaMode },
  });
  return next;
}

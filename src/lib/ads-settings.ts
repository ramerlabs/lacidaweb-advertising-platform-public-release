import { prisma } from "@/lib/prisma";
import type { PublisherAdServingMode } from "@prisma/client";

export type { PublisherAdServingMode };

export type AdsSettingsData = {
  adsEnabled: boolean;
  adsProfitMarginPercent: number;
  adWalletTopUpUsd: number;
  publisherAdServingMode: PublisherAdServingMode;
  publisherAdRotateSeconds: number;
  publisherAutoAdsEnabled: boolean;
  /** Publisher earn rate: cents per 1000 valid impressions */
  publisherCpmCents: number;
  /** Publisher earn rate: cents per valid click */
  publisherCpcCents: number;
  /** Minimum balance required to request a payout (cents) */
  publisherMinPayoutCents: number;
};

const DEFAULTS: AdsSettingsData = {
  adsEnabled: true,
  adsProfitMarginPercent: 0,
  adWalletTopUpUsd: 25,
  publisherAdServingMode: "ROTATE_ALL",
  publisherAdRotateSeconds: 8,
  publisherAutoAdsEnabled: true,
  publisherCpmCents: 100, // $1.00 CPM
  publisherCpcCents: 10, // $0.10 CPC
  publisherMinPayoutCents: 2500, // $25.00
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
      publisherCpmCents: row?.publisherCpmCents ?? DEFAULTS.publisherCpmCents,
      publisherCpcCents: row?.publisherCpcCents ?? DEFAULTS.publisherCpcCents,
      publisherMinPayoutCents: row?.publisherMinPayoutCents ?? DEFAULTS.publisherMinPayoutCents,
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
    publisherCpmCents: Math.max(0, input.publisherCpmCents ?? current.publisherCpmCents),
    publisherCpcCents: Math.max(0, input.publisherCpcCents ?? current.publisherCpcCents),
    publisherMinPayoutCents: Math.max(
      100,
      input.publisherMinPayoutCents ?? current.publisherMinPayoutCents,
    ),
  };

  await prisma.integrationSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...next },
    update: next,
  });
  return next;
}

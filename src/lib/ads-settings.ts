import { prisma } from "@/lib/prisma";
import type { PublisherAdServingMode } from "@prisma/client";
import {
  LANDING_FAKE_STATS_DEFAULTS,
  displayLandingAdStats,
  type LandingFakeStatsConfig,
} from "@/lib/landing-stats";

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
  /** Landing hero: synthetic impressions/clicks that keep growing */
  landingFakeStatsEnabled: boolean;
  landingFakeImpressionsBase: number;
  landingFakeClicksBase: number;
  landingFakeImpressionsPerHour: number;
  landingFakeClicksPerHour: number;
  landingFakeStatsStartedAt: string;
};

const DEFAULTS: AdsSettingsData = {
  adsEnabled: true,
  /**
   * Platform keeps this % of advertiser spend; publisher share = 100 − margin.
   * Default 55% balances profit with competitive advertiser CPC/CPM (editable in admin).
   */
  adsProfitMarginPercent: 55,
  adWalletTopUpUsd: 25,
  publisherAdServingMode: "ROTATE_ALL",
  publisherAdRotateSeconds: 8,
  publisherAutoAdsEnabled: true,
  publisherCpmCents: 100,
  publisherCpcCents: 10,
  publisherMinPayoutCents: 2500,
  landingFakeStatsEnabled: LANDING_FAKE_STATS_DEFAULTS.enabled,
  landingFakeImpressionsBase: LANDING_FAKE_STATS_DEFAULTS.impressionsBase,
  landingFakeClicksBase: LANDING_FAKE_STATS_DEFAULTS.clicksBase,
  landingFakeImpressionsPerHour: LANDING_FAKE_STATS_DEFAULTS.impressionsPerHour,
  landingFakeClicksPerHour: LANDING_FAKE_STATS_DEFAULTS.clicksPerHour,
  landingFakeStatsStartedAt: LANDING_FAKE_STATS_DEFAULTS.startedAt.toISOString(),
};

function toFakeConfig(settings: AdsSettingsData): LandingFakeStatsConfig {
  const started = new Date(settings.landingFakeStatsStartedAt);
  return {
    enabled: settings.landingFakeStatsEnabled,
    impressionsBase: settings.landingFakeImpressionsBase,
    clicksBase: settings.landingFakeClicksBase,
    impressionsPerHour: settings.landingFakeImpressionsPerHour,
    clicksPerHour: settings.landingFakeClicksPerHour,
    startedAt: Number.isNaN(started.getTime())
      ? LANDING_FAKE_STATS_DEFAULTS.startedAt
      : started,
  };
}

export async function getAdsSettings(): Promise<AdsSettingsData> {
  try {
    const row = await prisma.integrationSettings.findUnique({ where: { id: "default" } });

    // Legacy installs stored 0; apply the competitive 55% default once.
    // After that, Admin → Publisher ads is the source of truth (any percent you save sticks).
    let margin = row?.adsProfitMarginPercent;
    if (row && (margin == null || margin === 0)) {
      await prisma.integrationSettings.update({
        where: { id: "default" },
        data: { adsProfitMarginPercent: DEFAULTS.adsProfitMarginPercent },
      });
      margin = DEFAULTS.adsProfitMarginPercent;
    }

    return {
      adsEnabled: row?.adsEnabled ?? DEFAULTS.adsEnabled,
      adsProfitMarginPercent: margin ?? DEFAULTS.adsProfitMarginPercent,
      adWalletTopUpUsd: row?.adWalletTopUpUsd ?? DEFAULTS.adWalletTopUpUsd,
      publisherAdServingMode:
        row?.publisherAdServingMode === "PERSONALIZED" ? "PERSONALIZED" : "ROTATE_ALL",
      publisherAdRotateSeconds: row?.publisherAdRotateSeconds ?? DEFAULTS.publisherAdRotateSeconds,
      publisherAutoAdsEnabled: row?.publisherAutoAdsEnabled ?? DEFAULTS.publisherAutoAdsEnabled,
      publisherCpmCents: row?.publisherCpmCents ?? DEFAULTS.publisherCpmCents,
      publisherCpcCents: row?.publisherCpcCents ?? DEFAULTS.publisherCpcCents,
      publisherMinPayoutCents: row?.publisherMinPayoutCents ?? DEFAULTS.publisherMinPayoutCents,
      landingFakeStatsEnabled: row?.landingFakeStatsEnabled ?? DEFAULTS.landingFakeStatsEnabled,
      landingFakeImpressionsBase:
        row?.landingFakeImpressionsBase ?? DEFAULTS.landingFakeImpressionsBase,
      landingFakeClicksBase: row?.landingFakeClicksBase ?? DEFAULTS.landingFakeClicksBase,
      landingFakeImpressionsPerHour:
        row?.landingFakeImpressionsPerHour ?? DEFAULTS.landingFakeImpressionsPerHour,
      landingFakeClicksPerHour: row?.landingFakeClicksPerHour ?? DEFAULTS.landingFakeClicksPerHour,
      landingFakeStatsStartedAt: (
        row?.landingFakeStatsStartedAt ?? new Date(DEFAULTS.landingFakeStatsStartedAt)
      ).toISOString(),
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
    landingFakeStatsEnabled: input.landingFakeStatsEnabled ?? current.landingFakeStatsEnabled,
    landingFakeImpressionsBase: Math.max(
      0,
      Math.floor(input.landingFakeImpressionsBase ?? current.landingFakeImpressionsBase),
    ),
    landingFakeClicksBase: Math.max(
      0,
      Math.floor(input.landingFakeClicksBase ?? current.landingFakeClicksBase),
    ),
    landingFakeImpressionsPerHour: Math.max(
      0,
      input.landingFakeImpressionsPerHour ?? current.landingFakeImpressionsPerHour,
    ),
    landingFakeClicksPerHour: Math.max(
      0,
      input.landingFakeClicksPerHour ?? current.landingFakeClicksPerHour,
    ),
    landingFakeStatsStartedAt:
      input.landingFakeStatsStartedAt ?? current.landingFakeStatsStartedAt,
  };

  const startedAt = new Date(next.landingFakeStatsStartedAt);
  const startedAtSafe = Number.isNaN(startedAt.getTime())
    ? LANDING_FAKE_STATS_DEFAULTS.startedAt
    : startedAt;

  await prisma.integrationSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      adsEnabled: next.adsEnabled,
      adsProfitMarginPercent: next.adsProfitMarginPercent,
      adWalletTopUpUsd: next.adWalletTopUpUsd,
      publisherAdServingMode: next.publisherAdServingMode,
      publisherAdRotateSeconds: next.publisherAdRotateSeconds,
      publisherAutoAdsEnabled: next.publisherAutoAdsEnabled,
      publisherCpmCents: next.publisherCpmCents,
      publisherCpcCents: next.publisherCpcCents,
      publisherMinPayoutCents: next.publisherMinPayoutCents,
      landingFakeStatsEnabled: next.landingFakeStatsEnabled,
      landingFakeImpressionsBase: next.landingFakeImpressionsBase,
      landingFakeClicksBase: next.landingFakeClicksBase,
      landingFakeImpressionsPerHour: next.landingFakeImpressionsPerHour,
      landingFakeClicksPerHour: next.landingFakeClicksPerHour,
      landingFakeStatsStartedAt: startedAtSafe,
    },
    update: {
      adsEnabled: next.adsEnabled,
      adsProfitMarginPercent: next.adsProfitMarginPercent,
      adWalletTopUpUsd: next.adWalletTopUpUsd,
      publisherAdServingMode: next.publisherAdServingMode,
      publisherAdRotateSeconds: next.publisherAdRotateSeconds,
      publisherAutoAdsEnabled: next.publisherAutoAdsEnabled,
      publisherCpmCents: next.publisherCpmCents,
      publisherCpcCents: next.publisherCpcCents,
      publisherMinPayoutCents: next.publisherMinPayoutCents,
      landingFakeStatsEnabled: next.landingFakeStatsEnabled,
      landingFakeImpressionsBase: next.landingFakeImpressionsBase,
      landingFakeClicksBase: next.landingFakeClicksBase,
      landingFakeImpressionsPerHour: next.landingFakeImpressionsPerHour,
      landingFakeClicksPerHour: next.landingFakeClicksPerHour,
      landingFakeStatsStartedAt: startedAtSafe,
    },
  });
  return next;
}

export async function getLandingAdStatsDisplay() {
  const settings = await getAdsSettings();
  let realImpressions = 0;
  let realClicks = 0;
  try {
    const [impressions, clicks] = await Promise.all([
      prisma.adEvent.count({ where: { type: "IMPRESSION", isValid: true } }),
      prisma.adEvent.count({ where: { type: "CLICK", isValid: true } }),
    ]);
    realImpressions = impressions;
    realClicks = clicks;
  } catch {
    // AdEvent table may not exist yet.
  }

  return displayLandingAdStats(
    { impressions: realImpressions, clicks: realClicks },
    toFakeConfig(settings),
  );
}

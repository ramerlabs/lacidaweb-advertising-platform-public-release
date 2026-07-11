import { prisma } from "@/lib/prisma";
import type { PublisherAdServingMode } from "@prisma/client";
import {
  LANDING_FAKE_STATS_DEFAULTS,
  displayLandingAdStats,
  type LandingFakeStatsConfig,
} from "@/lib/landing-stats";
import { PLATFORM_SHARE_OF_GROSS_PERCENT } from "@/lib/revenue-share";

export type { PublisherAdServingMode };

export type AdsSettingsData = {
  adsEnabled: boolean;
  /**
   * Platform cumulative share of advertiser gross spend (fixed at 32% by revenue-share formula).
   * Kept for budget pricing helpers and display; settlement uses the two-step split.
   */
  adsProfitMarginPercent: number;
  adWalletTopUpUsd: number;
  publisherAdServingMode: PublisherAdServingMode;
  publisherAdRotateSeconds: number;
  publisherAutoAdsEnabled: boolean;
  /**
   * Advertiser gross CPM (cents / 1,000 impressions).
   * Publisher earn = 68% of this via revenue share at settlement.
   */
  publisherCpmCents: number;
  /**
   * Advertiser gross CPC (cents / click).
   * Publisher earn = 68% of this via revenue share at settlement.
   */
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
  /** Fill promo when fewer paid ads than auto slots (editable in admin). */
  houseAdHeadline: string;
  houseAdBody: string;
  houseAdCtaLabel: string;
  houseAdUrl: string;
};

const DEFAULTS: AdsSettingsData = {
  adsEnabled: true,
  adsProfitMarginPercent: PLATFORM_SHARE_OF_GROSS_PERCENT,
  adWalletTopUpUsd: 25,
  publisherAdServingMode: "ROTATE_ALL",
  publisherAdRotateSeconds: 8,
  publisherAutoAdsEnabled: true,
  // Advertiser gross defaults ($1.00 CPM / $0.10 CPC) → publisher ~$0.68 / $0.07
  publisherCpmCents: 100,
  publisherCpcCents: 10,
  publisherMinPayoutCents: 2500,
  landingFakeStatsEnabled: LANDING_FAKE_STATS_DEFAULTS.enabled,
  landingFakeImpressionsBase: LANDING_FAKE_STATS_DEFAULTS.impressionsBase,
  landingFakeClicksBase: LANDING_FAKE_STATS_DEFAULTS.clicksBase,
  landingFakeImpressionsPerHour: LANDING_FAKE_STATS_DEFAULTS.impressionsPerHour,
  landingFakeClicksPerHour: LANDING_FAKE_STATS_DEFAULTS.clicksPerHour,
  landingFakeStatsStartedAt: LANDING_FAKE_STATS_DEFAULTS.startedAt.toISOString(),
  houseAdHeadline: "",
  houseAdBody: "",
  houseAdCtaLabel: "Visit lacidaweb.com",
  houseAdUrl: "",
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

/**
 * One-time migrate from legacy "publisher rate + margin markup" to advertiser-gross rates
 * under the fixed 32% platform / 68% publisher revenue share.
 */
async function migrateLegacyMarginRates(row: {
  adsProfitMarginPercent: number | null;
  publisherCpmCents: number | null;
  publisherCpcCents: number | null;
}): Promise<{
  margin: number;
  cpmCents: number;
  cpcCents: number;
} | null> {
  const margin = row.adsProfitMarginPercent;
  if (margin == null || margin === PLATFORM_SHARE_OF_GROSS_PERCENT) return null;
  // Legacy 0 was coerced to 55; treat both as old publisher-centric rates.
  const oldMarginPercent = margin === 0 ? 55 : margin;
  if (oldMarginPercent === PLATFORM_SHARE_OF_GROSS_PERCENT) return null;

  const oldM = Math.min(99, Math.max(0, oldMarginPercent)) / 100;
  const cpm = row.publisherCpmCents ?? DEFAULTS.publisherCpmCents;
  const cpc = row.publisherCpcCents ?? DEFAULTS.publisherCpcCents;
  // Old model stored publisher earn rates; convert to advertiser gross.
  const nextCpm =
    oldM > 0 && oldM < 1 ? Math.max(0, Math.ceil(cpm / (1 - oldM))) : cpm;
  const nextCpc =
    oldM > 0 && oldM < 1 ? Math.max(0, Math.ceil(cpc / (1 - oldM))) : cpc;

  await prisma.integrationSettings.update({
    where: { id: "default" },
    data: {
      adsProfitMarginPercent: PLATFORM_SHARE_OF_GROSS_PERCENT,
      publisherCpmCents: nextCpm,
      publisherCpcCents: nextCpc,
    },
  });

  return {
    margin: PLATFORM_SHARE_OF_GROSS_PERCENT,
    cpmCents: nextCpm,
    cpcCents: nextCpc,
  };
}

export async function getAdsSettings(): Promise<AdsSettingsData> {
  try {
    const row = await prisma.integrationSettings.findUnique({ where: { id: "default" } });

    let margin = row?.adsProfitMarginPercent ?? DEFAULTS.adsProfitMarginPercent;
    let cpmCents = row?.publisherCpmCents ?? DEFAULTS.publisherCpmCents;
    let cpcCents = row?.publisherCpcCents ?? DEFAULTS.publisherCpcCents;

    if (row) {
      const migrated = await migrateLegacyMarginRates({
        adsProfitMarginPercent: row.adsProfitMarginPercent,
        publisherCpmCents: row.publisherCpmCents,
        publisherCpcCents: row.publisherCpcCents,
      });
      if (migrated) {
        margin = migrated.margin;
        cpmCents = migrated.cpmCents;
        cpcCents = migrated.cpcCents;
      } else if (margin !== PLATFORM_SHARE_OF_GROSS_PERCENT) {
        await prisma.integrationSettings.update({
          where: { id: "default" },
          data: { adsProfitMarginPercent: PLATFORM_SHARE_OF_GROSS_PERCENT },
        });
        margin = PLATFORM_SHARE_OF_GROSS_PERCENT;
      }
    }

    return {
      adsEnabled: row?.adsEnabled ?? DEFAULTS.adsEnabled,
      adsProfitMarginPercent: margin,
      adWalletTopUpUsd: row?.adWalletTopUpUsd ?? DEFAULTS.adWalletTopUpUsd,
      publisherAdServingMode:
        row?.publisherAdServingMode === "PERSONALIZED" ? "PERSONALIZED" : "ROTATE_ALL",
      publisherAdRotateSeconds: row?.publisherAdRotateSeconds ?? DEFAULTS.publisherAdRotateSeconds,
      publisherAutoAdsEnabled: row?.publisherAutoAdsEnabled ?? DEFAULTS.publisherAutoAdsEnabled,
      publisherCpmCents: cpmCents,
      publisherCpcCents: cpcCents,
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
      houseAdHeadline: row?.houseAdHeadline?.trim() || DEFAULTS.houseAdHeadline,
      houseAdBody: row?.houseAdBody?.trim() || DEFAULTS.houseAdBody,
      houseAdCtaLabel: row?.houseAdCtaLabel?.trim() || DEFAULTS.houseAdCtaLabel,
      houseAdUrl: row?.houseAdUrl?.trim() || DEFAULTS.houseAdUrl,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function updateAdsSettings(input: Partial<AdsSettingsData>): Promise<AdsSettingsData> {
  const current = await getAdsSettings();
  const next: AdsSettingsData = {
    adsEnabled: input.adsEnabled ?? current.adsEnabled,
    adsProfitMarginPercent: PLATFORM_SHARE_OF_GROSS_PERCENT,
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
    houseAdHeadline: (input.houseAdHeadline ?? current.houseAdHeadline).trim().slice(0, 120),
    houseAdBody: (input.houseAdBody ?? current.houseAdBody).trim().slice(0, 500),
    houseAdCtaLabel: (input.houseAdCtaLabel ?? current.houseAdCtaLabel).trim().slice(0, 40),
    houseAdUrl: (input.houseAdUrl ?? current.houseAdUrl).trim().slice(0, 500),
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
      houseAdHeadline: next.houseAdHeadline || null,
      houseAdBody: next.houseAdBody || null,
      houseAdCtaLabel: next.houseAdCtaLabel || null,
      houseAdUrl: next.houseAdUrl || null,
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
      houseAdHeadline: next.houseAdHeadline || null,
      houseAdBody: next.houseAdBody || null,
      houseAdCtaLabel: next.houseAdCtaLabel || null,
      houseAdUrl: next.houseAdUrl || null,
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

import { prisma } from "@/lib/prisma";
import { getAdsSettings, type AdsSettingsData } from "@/lib/ads-settings";
import { getSiteSettings } from "@/lib/site-settings";
import { brand } from "@/lib/brand";
import {
  campaignHasDeliveryBudget,
  getAdvertiserRates,
  isWithinSchedule,
  minChargeCents,
} from "@/services/advertiser-billing";
import {
  recordTrackedClick,
  recordTrackedImpression,
  type AdEventRequestMeta,
} from "@/services/publisher-earnings";

/** Synthetic promo when no paid campaigns are eligible to serve. */
export const HOUSE_AD_ID = "house";

export type ServedAd = {
  adId: string;
  headline: string;
  primaryText: string;
  imageUrl: string | null;
  destinationUrl: string;
  ctaLabel: string;
  width: number;
  height: number;
  format: string;
  clickUrl: string;
  /** True for platform promo fill — no advertiser charge / publisher earn. */
  isHouseAd?: boolean;
};

export type PlacementServeResult = {
  ads: ServedAd[];
  rotationSeconds: number;
  servingMode: AdsSettingsData["publisherAdServingMode"];
};

type EligibleAd = Awaited<ReturnType<typeof fetchCandidateAds>>[number];

async function fetchCandidateAds() {
  return prisma.ad.findMany({
    where: {
      status: { in: ["ACTIVE", "APPROVED"] },
      campaign: {
        adType: "lacidaweb",
        lifecycleStatus: { in: ["ACTIVE", "APPROVED"] },
      },
    },
    include: {
      campaign: {
        include: {
          team: { select: { id: true, adWalletBalanceCents: true } },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

async function getEligibleAds(settings: AdsSettingsData): Promise<EligibleAd[]> {
  const candidates = await fetchCandidateAds();
  const rates = getAdvertiserRates(settings);
  const need = minChargeCents(rates);
  const eligible: EligibleAd[] = [];

  for (const ad of candidates) {
    const campaign = ad.campaign;
    if (!isWithinSchedule(campaign)) continue;
    if (need > 0 && campaign.team.adWalletBalanceCents < need) continue;
    const hasBudget = await campaignHasDeliveryBudget({
      campaignId: campaign.id,
      budgetAmount: campaign.budgetAmount,
      budgetTypeEnum: campaign.budgetTypeEnum,
      budgetType: campaign.budgetType,
      lifetimeSpendCents: campaign.lifetimeSpendCents,
      platformBudgetUsd: campaign.platformBudgetUsd,
    });
    if (!hasBudget) continue;
    eligible.push(ad);
  }

  return eligible;
}

function toServedAd(
  ad: EligibleAd,
  placement: { width: number; height: number; format: string },
  placementKey: string,
  origin?: string,
): ServedAd {
  const clickPath = `/api/ads/click?adId=${encodeURIComponent(ad.id)}&placement=${encodeURIComponent(placementKey)}`;
  const meta = ad.metadata as { format?: string } | null;
  const creativeFormat = meta?.format;
  const serveFormat =
    creativeFormat === "TEXT_BOX" || creativeFormat === "TEXT_INLINE"
      ? creativeFormat
      : creativeFormat === "IMAGE" || creativeFormat === "VIDEO"
        ? placement.format
        : placement.format;

  return {
    adId: ad.id,
    headline: ad.headline,
    primaryText: ad.primaryText,
    imageUrl: ad.imageUrl,
    destinationUrl: ad.destinationUrl,
    ctaLabel: ad.ctaLabel,
    width: placement.width,
    height: placement.height,
    format: serveFormat,
    clickUrl: origin ? `${origin}${clickPath}` : clickPath,
  };
}

function rotateFromIndex<T>(items: T[], startIndex: number): T[] {
  if (!items.length) return [];
  const safeIndex = ((startIndex % items.length) + items.length) % items.length;
  return [...items.slice(safeIndex), ...items.slice(0, safeIndex)];
}

function pickPersonalizedIndex(visitorId: string, adCount: number): number {
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    hash = (hash * 31 + visitorId.charCodeAt(i)) >>> 0;
  }
  return hash % adCount;
}

async function buildHouseAd(
  placement: { width: number; height: number; format: string },
  origin?: string,
): Promise<ServedAd> {
  const site = await getSiteSettings();
  const name = site.title?.trim() || String(brand.name);
  const base = (site.url || brand.url || origin || "").replace(/\/$/, "");
  const destinationUrl = `${base}/register/advertiser`;

  return {
    adId: HOUSE_AD_ID,
    headline: `Advertise with ${name}`,
    primaryText: `Reach customers on sites across the ${name} network. Launch a campaign in minutes.`,
    imageUrl: null,
    destinationUrl,
    ctaLabel: "Get started",
    width: placement.width,
    height: placement.height,
    format:
      placement.format === "BANNER" ||
      placement.format === "RECTANGLE" ||
      placement.format === "SKYSCRAPER"
        ? "TEXT_BOX"
        : placement.format || "TEXT_BOX",
    clickUrl: destinationUrl,
    isHouseAd: true,
  };
}

export async function serveAdsForPlacement(
  placementKey: string,
  opts?: { visitorId?: string; origin?: string; meta?: AdEventRequestMeta },
): Promise<PlacementServeResult | null> {
  const settings = await getAdsSettings();
  if (!settings.adsEnabled) {
    return null;
  }

  const placement = await prisma.adPlacement.findUnique({
    where: { placementKey, isActive: true },
    include: { site: true },
  });

  if (!placement || placement.site.status !== "ACTIVE") {
    return null;
  }

  const eligible = await getEligibleAds(settings);
  if (!eligible.length) {
    const house = await buildHouseAd(placement, opts?.origin);
    return {
      ads: [house],
      rotationSeconds: 0,
      servingMode: settings.publisherAdServingMode,
    };
  }

  let startIndex = placement.impressions % eligible.length;

  if (settings.publisherAdServingMode === "PERSONALIZED" && opts?.visitorId) {
    startIndex = pickPersonalizedIndex(opts.visitorId, eligible.length);
  }

  const ordered = rotateFromIndex(eligible, startIndex);
  const primary = ordered[0];

  await recordTrackedImpression({
    placementId: placement.id,
    teamId: placement.site.teamId,
    adId: primary.id,
    campaignId: primary.campaignId,
    advertiserTeamId: primary.campaign.teamId,
    meta: {
      visitorId: opts?.visitorId || opts?.meta?.visitorId,
      ip: opts?.meta?.ip,
      userAgent: opts?.meta?.userAgent,
    },
  });

  const ads = ordered.map((ad) => toServedAd(ad, placement, placementKey, opts?.origin));

  // ROTATE_ALL: return list for timed swap in one slot. Otherwise serve a single ad.
  const serveList =
    settings.publisherAdServingMode === "ROTATE_ALL" ? ads : ads.slice(0, 1);

  return {
    ads: serveList,
    rotationSeconds:
      settings.publisherAdServingMode === "ROTATE_ALL" && serveList.length > 1
        ? settings.publisherAdRotateSeconds
        : 0,
    servingMode: settings.publisherAdServingMode,
  };
}

/** @deprecated Use serveAdsForPlacement */
export async function pickAdForPlacement(placementKey: string): Promise<ServedAd | null> {
  const result = await serveAdsForPlacement(placementKey);
  return result?.ads[0] ?? null;
}

export async function recordAdClick(
  adId: string,
  placementKey: string,
  meta?: AdEventRequestMeta,
) {
  if (adId === HOUSE_AD_ID) {
    const house = await buildHouseAd({ width: 300, height: 250, format: "TEXT_BOX" });
    return house.destinationUrl;
  }

  const placement = await prisma.adPlacement.findUnique({
    where: { placementKey, isActive: true },
    include: { site: true },
  });
  if (!placement || placement.site.status !== "ACTIVE") return null;

  const ad = await prisma.ad.findFirst({
    where: { id: adId, status: { in: ["ACTIVE", "APPROVED"] } },
    select: {
      id: true,
      destinationUrl: true,
      campaignId: true,
      campaign: { select: { teamId: true } },
    },
  });
  if (!ad) return null;

  await recordTrackedClick({
    placementId: placement.id,
    teamId: placement.site.teamId,
    adId: ad.id,
    campaignId: ad.campaignId,
    advertiserTeamId: ad.campaign.teamId,
    meta: meta || {},
  });

  return ad.destinationUrl;
}

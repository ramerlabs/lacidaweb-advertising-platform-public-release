import { prisma } from "@/lib/prisma";
import { getAdsSettings, type AdsSettingsData } from "@/lib/ads-settings";
import {
  recordTrackedClick,
  recordTrackedImpression,
  type AdEventRequestMeta,
} from "@/services/publisher-earnings";

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
};

export type PlacementServeResult = {
  ads: ServedAd[];
  rotationSeconds: number;
  servingMode: AdsSettingsData["publisherAdServingMode"];
};

async function getEligibleAds() {
  return prisma.ad.findMany({
    where: {
      status: { in: ["ACTIVE", "APPROVED"] },
      campaign: {
        adType: "lacidaweb",
        lifecycleStatus: { in: ["ACTIVE", "APPROVED"] },
      },
    },
    include: { campaign: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

function toServedAd(
  ad: Awaited<ReturnType<typeof getEligibleAds>>[number],
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

  const eligible = await getEligibleAds();
  if (!eligible.length) return null;

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
    meta: {
      visitorId: opts?.visitorId || opts?.meta?.visitorId,
      ip: opts?.meta?.ip,
      userAgent: opts?.meta?.userAgent,
    },
  });

  const ads = ordered.map((ad) => toServedAd(ad, placement, placementKey, opts?.origin));

  return {
    ads,
    rotationSeconds:
      settings.publisherAdServingMode === "ROTATE_ALL" ? settings.publisherAdRotateSeconds : 0,
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
  const placement = await prisma.adPlacement.findUnique({
    where: { placementKey, isActive: true },
    include: { site: true },
  });
  if (!placement || placement.site.status !== "ACTIVE") return null;

  const ad = await prisma.ad.findFirst({
    where: { id: adId, status: { in: ["ACTIVE", "APPROVED"] } },
    select: { id: true, destinationUrl: true, campaignId: true },
  });
  if (!ad) return null;

  await recordTrackedClick({
    placementId: placement.id,
    teamId: placement.site.teamId,
    adId: ad.id,
    campaignId: ad.campaignId,
    meta: meta || {},
  });

  return ad.destinationUrl;
}

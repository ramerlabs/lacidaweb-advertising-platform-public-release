import type { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAdsSettings } from "@/lib/ads-settings";
import {
  chargeAdvertiserClick,
  getAdvertiserRates,
  maybeChargeAdvertiserCpmBatch,
} from "@/services/advertiser-billing";

const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|preview|headless|phantom|selenium|puppeteer|curl|wget|python-requests|scrapy/i;

export type AdEventRequestMeta = {
  visitorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

function hashValue(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 32);
}

function isBot(userAgent?: string | null): boolean {
  if (!userAgent?.trim()) return true;
  return BOT_UA.test(userAgent);
}

async function recentDuplicate(input: {
  placementId: string;
  type: "IMPRESSION" | "CLICK";
  visitorHash: string | null;
  ipHash: string | null;
  windowMs: number;
}): Promise<boolean> {
  const since = new Date(Date.now() - input.windowMs);
  const or: Array<{ visitorHash?: string; ipHash?: string }> = [];
  if (input.visitorHash) or.push({ visitorHash: input.visitorHash });
  if (input.ipHash) or.push({ ipHash: input.ipHash });
  if (!or.length) return false;

  const found = await prisma.adEvent.findFirst({
    where: {
      placementId: input.placementId,
      type: input.type,
      createdAt: { gte: since },
      OR: or,
    },
    select: { id: true },
  });
  return Boolean(found);
}

export async function recordTrackedImpression(input: {
  placementId: string;
  teamId: string;
  adId: string;
  campaignId: string;
  advertiserTeamId: string;
  meta: AdEventRequestMeta;
}): Promise<{ counted: boolean; earnedCents: number; chargedCents: number }> {
  const settings = await getAdsSettings();
  const visitorHash = hashValue(input.meta.visitorId);
  const ipHash = hashValue(input.meta.ip);
  const rateKey = `imp:${input.placementId}:${visitorHash || ipHash || "anon"}`;

  let fraudReason: string | null = null;
  if (isBot(input.meta.userAgent)) fraudReason = "bot_user_agent";
  else if (!checkRateLimit(rateKey, 30, 60_000)) fraudReason = "rate_limited";
  else if (
    await recentDuplicate({
      placementId: input.placementId,
      type: "IMPRESSION",
      visitorHash,
      ipHash,
      windowMs: 30_000,
    })
  ) {
    fraudReason = "duplicate_impression";
  }

  const isValid = !fraudReason;

  await prisma.adEvent.create({
    data: {
      type: "IMPRESSION",
      teamId: input.teamId,
      placementId: input.placementId,
      adId: input.adId,
      campaignId: input.campaignId,
      visitorHash,
      ipHash,
      userAgent: input.meta.userAgent?.slice(0, 500) || null,
      isValid,
      fraudReason,
      earnedCents: 0,
    },
  });

  if (!isValid) return { counted: false, earnedCents: 0, chargedCents: 0 };

  await prisma.adPlacement.update({
    where: { id: input.placementId },
    data: { impressions: { increment: 1 } },
  });

  const rates = getAdvertiserRates(settings);
  const chargedCents = await maybeChargeAdvertiserCpmBatch({
    advertiserTeamId: input.advertiserTeamId,
    campaignId: input.campaignId,
    adId: input.adId,
    cpmCents: rates.cpmCents,
  });
  const earnedCents = await maybeCreditCpmBatch(input.teamId, settings.publisherCpmCents);

  return { counted: true, earnedCents, chargedCents };
}

async function maybeCreditCpmBatch(teamId: string, cpmCents: number): Promise<number> {
  if (cpmCents <= 0) return 0;

  const validCount = await prisma.adEvent.count({
    where: { teamId, type: "IMPRESSION", isValid: true },
  });

  // Credit once per exact multiple of 1000 valid impressions.
  if (validCount === 0 || validCount % 1000 !== 0) return 0;

  return creditPublisherEarning({
    teamId,
    amountCents: cpmCents,
    description: `CPM earnings for 1,000 impressions`,
    metadata: { kind: "CPM", impressions: validCount, rateCents: cpmCents },
  });
}

export async function recordTrackedClick(input: {
  placementId: string;
  teamId: string;
  adId: string;
  campaignId: string | null;
  advertiserTeamId?: string | null;
  meta: AdEventRequestMeta;
}): Promise<{
  counted: boolean;
  earnedCents: number;
  chargedCents: number;
  fraudReason: string | null;
}> {
  const settings = await getAdsSettings();
  const visitorHash = hashValue(input.meta.visitorId);
  const ipHash = hashValue(input.meta.ip);
  const rateKey = `clk:${input.placementId}:${visitorHash || ipHash || "anon"}`;

  let fraudReason: string | null = null;
  if (isBot(input.meta.userAgent)) fraudReason = "bot_user_agent";
  else if (!checkRateLimit(rateKey, 10, 60_000)) fraudReason = "rate_limited";
  else if (
    await recentDuplicate({
      placementId: input.placementId,
      type: "CLICK",
      visitorHash,
      ipHash,
      windowMs: 60_000,
    })
  ) {
    fraudReason = "duplicate_click";
  }

  const isValid = !fraudReason;
  if (!isValid) {
    await prisma.adEvent.create({
      data: {
        type: "CLICK",
        teamId: input.teamId,
        placementId: input.placementId,
        adId: input.adId,
        campaignId: input.campaignId,
        visitorHash,
        ipHash,
        userAgent: input.meta.userAgent?.slice(0, 500) || null,
        isValid: false,
        fraudReason,
        earnedCents: 0,
      },
    });
    return { counted: false, earnedCents: 0, chargedCents: 0, fraudReason };
  }

  await prisma.adPlacement.update({
    where: { id: input.placementId },
    data: { clicks: { increment: 1 } },
  });

  let chargedCents = 0;
  const rates = getAdvertiserRates(settings);
  if (input.campaignId && input.advertiserTeamId && rates.cpcCents > 0) {
    chargedCents = await chargeAdvertiserClick({
      advertiserTeamId: input.advertiserTeamId,
      campaignId: input.campaignId,
      adId: input.adId,
      cpcCents: rates.cpcCents,
    });
  }

  const earnedCents = settings.publisherCpcCents > 0 ? settings.publisherCpcCents : 0;

  await prisma.adEvent.create({
    data: {
      type: "CLICK",
      teamId: input.teamId,
      placementId: input.placementId,
      adId: input.adId,
      campaignId: input.campaignId,
      visitorHash,
      ipHash,
      userAgent: input.meta.userAgent?.slice(0, 500) || null,
      isValid: true,
      fraudReason: null,
      earnedCents,
    },
  });

  if (earnedCents > 0) {
    await creditPublisherEarning({
      teamId: input.teamId,
      amountCents: earnedCents,
      description: "CPC earning for valid click",
      metadata: { kind: "CPC", adId: input.adId, rateCents: earnedCents },
    });
  }

  return { counted: true, earnedCents, chargedCents, fraudReason: null };
}

export async function creditPublisherEarning(input: {
  teamId: string;
  amountCents: number;
  description: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<number> {
  if (input.amountCents <= 0) return 0;

  await prisma.$transaction(async (tx) => {
    const team = await tx.team.update({
      where: { id: input.teamId },
      data: {
        publisherBalanceCents: { increment: input.amountCents },
        publisherLifetimeEarnedCents: { increment: input.amountCents },
      },
      select: { publisherBalanceCents: true },
    });

    await tx.walletTransaction.create({
      data: {
        teamId: input.teamId,
        type: "PUBLISHER_EARNING",
        status: "COMPLETED",
        amountCents: input.amountCents,
        balanceAfterCents: team.publisherBalanceCents,
        description: input.description,
        metadata: input.metadata,
        completedAt: new Date(),
      },
    });
  });

  return input.amountCents;
}

export function clientIpFromRequest(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

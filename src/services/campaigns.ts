import type { Prisma } from "@prisma/client";
import type {
  AdCreativeStatus,
  AdvertiserCreativeFormat,
  AudienceTargeting,
  BudgetType,
  CampaignDto,
  CampaignLifecycleStatus,
  CampaignObjective,
} from "@/types/lacidaweb";
import type { AdCreativeInput } from "@/types/lacidaweb";
import { prisma } from "@/lib/prisma";
import {
  refundCampaignReserve,
  repairPendingCampaignReserves,
  reserveCampaignBudget,
} from "@/services/wallet-ledger";
import { usdToCents } from "@/lib/ad-wallet";

const OBJECTIVE_TO_GOAL: Record<CampaignObjective, string> = {
  AWARENESS: "awareness",
  TRAFFIC: "traffic",
  CONVERSIONS: "engagement",
};

function parseAudienceTargeting(value: unknown): AudienceTargeting | null {
  if (!value || typeof value !== "object") return null;
  const record = value as AudienceTargeting;
  if (!record.location?.countries?.length) return null;
  return record;
}

function parseAdFormat(metadata: unknown): AdvertiserCreativeFormat {
  if (metadata && typeof metadata === "object" && "format" in metadata) {
    const value = (metadata as { format?: string }).format;
    if (value === "TEXT_BOX" || value === "TEXT_INLINE" || value === "VIDEO") return value;
  }
  return "IMAGE";
}

function toCampaignDto(
  campaign: Awaited<ReturnType<typeof fetchCampaignRecord>>,
): CampaignDto {
  return {
    id: campaign.id,
    teamId: campaign.teamId,
    name: campaign.name,
    objective: campaign.objective,
    goal: campaign.goal,
    status: campaign.status,
    lifecycleStatus: campaign.lifecycleStatus as CampaignLifecycleStatus,
    platform: campaign.platform,
    adAccountId: campaign.adAccountId,
    budgetAmount: campaign.budgetAmount,
    budgetType: campaign.budgetType,
    budgetTypeEnum: campaign.budgetTypeEnum as BudgetType | null,
    scheduleStart: campaign.scheduleStart?.toISOString() ?? null,
    scheduleEnd: campaign.scheduleEnd?.toISOString() ?? null,
    targeting: parseAudienceTargeting(campaign.targeting),
    lifetimeSpendCents: campaign.lifetimeSpendCents,
    paymentStatus: campaign.paymentStatus,
    rejectionReason: campaign.rejectionReason,
    reviewedAt: campaign.reviewedAt?.toISOString() ?? null,
    ads: campaign.ads.map((ad) => ({
      id: ad.id,
      campaignId: ad.campaignId,
      name: ad.name,
      status: ad.status as AdCreativeStatus,
      format: parseAdFormat(ad.metadata),
      headline: ad.headline,
      primaryText: ad.primaryText,
      destinationUrl: ad.destinationUrl,
      ctaLabel: ad.ctaLabel,
      imageUrl: ad.imageUrl,
      videoUrl: ad.videoUrl,
      sortOrder: ad.sortOrder,
    })),
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

async function fetchCampaignRecord(campaignId: string, teamId: string) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, teamId },
    include: {
      ads: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!campaign) throw new Error("Campaign not found");
  return campaign;
}

export async function listTeamCampaigns(teamId: string, userId?: string): Promise<CampaignDto[]> {
  // Repair any campaigns that were submitted before wallet reserve was enforced.
  await repairPendingCampaignReserves(teamId, userId);

  const campaigns = await prisma.adCampaign.findMany({
    where: { teamId, adType: "lacidaweb" },
    include: { ads: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return campaigns.map(toCampaignDto);
}

export async function getTeamCampaign(teamId: string, campaignId: string): Promise<CampaignDto> {
  const campaign = await fetchCampaignRecord(campaignId, teamId);
  return toCampaignDto(campaign);
}

export async function createLacidawebCampaign(input: {
  teamId: string;
  userId: string;
  name: string;
  objective: CampaignObjective;
  targeting: AudienceTargeting;
  budgetType: BudgetType;
  budgetAmountUsd: number;
  scheduleStart?: string;
  scheduleEnd?: string;
  ads: AdCreativeInput[];
  platform?: string;
  adAccountId?: string;
}): Promise<CampaignDto> {
  const budgetTypeStr = input.budgetType === "DAILY" ? "daily" : "lifetime";
  const primaryAd = input.ads[0];
  const chargeCents = usdToCents(input.budgetAmountUsd);
  if (chargeCents <= 0) throw new Error("Campaign budget must be greater than zero");

  const campaign = await prisma.$transaction(async (tx) => {
    // Fail fast before creating the campaign row if wallet cannot cover the budget.
    const team = await tx.team.findUnique({
      where: { id: input.teamId },
      select: { adWalletBalanceCents: true },
    });
    if (!team) throw new Error("Team not found");
    if (team.adWalletBalanceCents < chargeCents) {
      throw new Error(
        `Insufficient wallet balance. Need $${input.budgetAmountUsd.toFixed(2)}, have $${(team.adWalletBalanceCents / 100).toFixed(2)}. Top up your wallet first.`,
      );
    }

    const record = await tx.adCampaign.create({
      data: {
        teamId: input.teamId,
        platform: input.platform || "lacidaweb",
        adAccountId: input.adAccountId || input.teamId,
        name: input.name,
        goal: OBJECTIVE_TO_GOAL[input.objective],
        objective: input.objective,
        adType: "lacidaweb",
        status: "pending_review",
        lifecycleStatus: "PENDING_REVIEW",
        budgetAmount: input.budgetAmountUsd,
        budgetType: budgetTypeStr,
        budgetTypeEnum: input.budgetType,
        platformBudgetUsd: input.budgetAmountUsd,
        clientChargeUsd: input.budgetAmountUsd,
        // Will be confirmed as reserved by reserveCampaignBudget in the same transaction.
        paymentStatus: "pending_payment",
        countries: input.targeting.location.countries,
        targeting: input.targeting as unknown as Prisma.InputJsonValue,
        scheduleStart: input.scheduleStart ? new Date(input.scheduleStart) : undefined,
        scheduleEnd: input.scheduleEnd ? new Date(input.scheduleEnd) : undefined,
        headline: primaryAd?.headline,
        body: primaryAd?.primaryText,
        linkUrl: primaryAd?.destinationUrl,
        imageUrl: primaryAd?.imageUrl,
      },
    });

    if (input.ads.length > 0) {
      await tx.ad.createMany({
        data: input.ads.map((ad, index) => ({
          campaignId: record.id,
          name: ad.name,
          status: "PENDING_REVIEW",
          headline: ad.headline,
          primaryText: ad.primaryText || ad.headline,
          destinationUrl: ad.destinationUrl,
          ctaLabel: ad.ctaLabel || "Learn More",
          imageUrl: ad.format === "IMAGE" ? ad.imageUrl : undefined,
          videoUrl: ad.format === "VIDEO" ? ad.videoUrl : undefined,
          sortOrder: index,
          metadata: { format: ad.format },
        })),
      });
    }

    await tx.campaignReview.create({
      data: {
        campaignId: record.id,
        action: "SUBMITTED",
        notes: "Campaign submitted via lacidaweb wizard",
      },
    });

    await tx.auditLog.create({
      data: {
        teamId: input.teamId,
        userId: input.userId,
        action: "campaign.submitted",
        message: `Submitted campaign "${input.name}" for review`,
        metadata: { campaignId: record.id, objective: input.objective },
      },
    });

    // Must succeed or the whole submit rolls back — prevents unpaid pending campaigns.
    await reserveCampaignBudget({
      tx,
      teamId: input.teamId,
      campaignId: record.id,
      budgetAmountUsd: input.budgetAmountUsd,
      userId: input.userId,
    });

    return record;
  });

  return getTeamCampaign(input.teamId, campaign.id);
}

export async function pauseTeamCampaign(teamId: string, campaignId: string, userId?: string) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, teamId, adType: "lacidaweb" },
  });
  if (!campaign) throw new Error("Campaign not found");
  if (!["ACTIVE", "APPROVED"].includes(campaign.lifecycleStatus)) {
    throw new Error("Only active campaigns can be paused");
  }

  await prisma.$transaction(async (tx) => {
    await tx.adCampaign.update({
      where: { id: campaignId },
      data: {
        lifecycleStatus: "PAUSED",
        status: "paused",
      },
    });
    await tx.ad.updateMany({
      where: { campaignId, status: { in: ["ACTIVE", "APPROVED"] } },
      data: { status: "PAUSED" },
    });
    if (userId) {
      await tx.auditLog.create({
        data: {
          teamId,
          userId,
          action: "campaign.paused",
          message: `Paused campaign "${campaign.name}"`,
          metadata: { campaignId },
        },
      });
    }
  });

  return getTeamCampaign(teamId, campaignId);
}

export async function resumeTeamCampaign(teamId: string, campaignId: string, userId?: string) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, teamId, adType: "lacidaweb" },
  });
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.lifecycleStatus !== "PAUSED") {
    throw new Error("Only paused campaigns can be resumed");
  }

  await prisma.$transaction(async (tx) => {
    await tx.adCampaign.update({
      where: { id: campaignId },
      data: {
        lifecycleStatus: "ACTIVE",
        status: "active",
      },
    });
    await tx.ad.updateMany({
      where: { campaignId, status: "PAUSED" },
      data: { status: "ACTIVE" },
    });
    if (userId) {
      await tx.auditLog.create({
        data: {
          teamId,
          userId,
          action: "campaign.resumed",
          message: `Resumed campaign "${campaign.name}"`,
          metadata: { campaignId },
        },
      });
    }
  });

  return getTeamCampaign(teamId, campaignId);
}

export async function deleteTeamCampaign(teamId: string, campaignId: string, userId?: string) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, teamId, adType: "lacidaweb" },
    select: { id: true, name: true, paymentStatus: true },
  });
  if (!campaign) throw new Error("Campaign not found");

  // Refund reserved budget before hard-delete (ledger keeps the REFUND row).
  if (["reserved", "funded", "paid"].includes(campaign.paymentStatus)) {
    await refundCampaignReserve({
      campaignId,
      teamId,
      reason: "Campaign deleted",
      adminUserId: userId,
    });
  }

  await prisma.$transaction(async (tx) => {
    if (userId) {
      await tx.auditLog.create({
        data: {
          teamId,
          userId,
          action: "campaign.deleted",
          message: `Deleted campaign "${campaign.name}"`,
          metadata: { campaignId },
        },
      });
    }
    await tx.adCampaign.delete({ where: { id: campaignId } });
  });

  return { ok: true as const, campaignId };
}

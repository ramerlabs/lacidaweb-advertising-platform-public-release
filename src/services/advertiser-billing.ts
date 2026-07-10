import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { usdToCents } from "@/lib/ad-wallet";
import type { AdsSettingsData } from "@/lib/ads-settings";
import { isCampaignPrepaid } from "@/services/wallet-ledger";

export type AdvertiserRates = {
  cpmCents: number;
  cpcCents: number;
  marginPercent: number;
};

/** Advertiser pays publisher rate marked up by ads profit margin. */
export function getAdvertiserRates(settings: AdsSettingsData): AdvertiserRates {
  const margin = Math.min(99, Math.max(0, settings.adsProfitMarginPercent)) / 100;
  const markup = margin >= 1 ? 1 : 1 / (1 - margin);
  return {
    cpmCents: Math.max(0, Math.ceil(settings.publisherCpmCents * markup)),
    cpcCents: Math.max(0, Math.ceil(settings.publisherCpcCents * markup)),
    marginPercent: settings.adsProfitMarginPercent,
  };
}

export function campaignBudgetCapCents(campaign: {
  budgetAmount: number;
  platformBudgetUsd?: number | null;
}): number {
  const usd = campaign.budgetAmount > 0 ? campaign.budgetAmount : campaign.platformBudgetUsd || 0;
  return Math.max(0, usdToCents(usd));
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function getCampaignSpendTodayCents(campaignId: string): Promise<number> {
  const since = startOfUtcDay();
  const rows = await prisma.walletTransaction.findMany({
    where: {
      campaignId,
      type: "AD_SPEND",
      status: "COMPLETED",
      createdAt: { gte: since },
    },
    select: { amountCents: true, metadata: true },
  });
  // Count delivery spend only (exclude campaign budget reserve).
  return rows.reduce((sum, row) => {
    const meta = row.metadata as { kind?: string } | null;
    if (meta?.kind === "CAMPAIGN_RESERVE" || meta?.kind === "AI_TOKEN_WALLET_PURCHASE") return sum;
    return sum + Math.abs(row.amountCents);
  }, 0);
}

export function isWithinSchedule(campaign: {
  scheduleStart?: Date | null;
  scheduleEnd?: Date | null;
}): boolean {
  const now = Date.now();
  if (campaign.scheduleStart && campaign.scheduleStart.getTime() > now) return false;
  if (campaign.scheduleEnd && campaign.scheduleEnd.getTime() < now) return false;
  return true;
}

export async function campaignHasDeliveryBudget(input: {
  campaignId: string;
  budgetAmount: number;
  budgetTypeEnum: "DAILY" | "LIFETIME" | null;
  budgetType: string;
  lifetimeSpendCents: number;
  platformBudgetUsd?: number | null;
}): Promise<boolean> {
  const cap = campaignBudgetCapCents(input);
  if (cap <= 0) return false;
  if (input.lifetimeSpendCents >= cap && isLifetimeBudget(input)) return false;

  if (isDailyBudget(input)) {
    const today = await getCampaignSpendTodayCents(input.campaignId);
    if (today >= cap) return false;
  } else if (input.lifetimeSpendCents >= cap) {
    return false;
  }
  return true;
}

function isDailyBudget(campaign: { budgetTypeEnum: "DAILY" | "LIFETIME" | null; budgetType: string }) {
  return campaign.budgetTypeEnum === "DAILY" || campaign.budgetType === "daily";
}

function isLifetimeBudget(campaign: {
  budgetTypeEnum: "DAILY" | "LIFETIME" | null;
  budgetType: string;
}) {
  return campaign.budgetTypeEnum === "LIFETIME" || campaign.budgetType === "lifetime";
}

export function minChargeCents(rates: AdvertiserRates): number {
  const perImp = rates.cpmCents > 0 ? Math.max(1, Math.ceil(rates.cpmCents / 1000)) : 0;
  const candidates = [rates.cpcCents, perImp].filter((n) => n > 0);
  return candidates.length ? Math.min(...candidates) : 0;
}

/**
 * Debit advertiser wallet for ad delivery. Returns charged cents, or 0 if skipped/failed.
 * Pauses the campaign when wallet or budget is exhausted.
 */
export async function chargeAdvertiserSpend(input: {
  advertiserTeamId: string;
  campaignId: string;
  amountCents: number;
  kind: "CPM" | "CPC";
  adId?: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ chargedCents: number; reason?: string }> {
  if (input.amountCents <= 0) return { chargedCents: 0 };

  try {
    const charged = await prisma.$transaction(async (tx) => {
      const campaign = await tx.adCampaign.findUnique({
        where: { id: input.campaignId },
        select: {
          id: true,
          teamId: true,
          budgetAmount: true,
          budgetType: true,
          budgetTypeEnum: true,
          platformBudgetUsd: true,
          lifetimeSpendCents: true,
          lifecycleStatus: true,
          paymentStatus: true,
        },
      });
      if (!campaign || campaign.teamId !== input.advertiserTeamId) {
        return { chargedCents: 0, reason: "campaign_missing" as const };
      }
      if (campaign.lifecycleStatus !== "ACTIVE" && campaign.lifecycleStatus !== "APPROVED") {
        return { chargedCents: 0, reason: "campaign_inactive" as const };
      }

      const prepaid = isCampaignPrepaid(campaign.paymentStatus);
      const cap = campaignBudgetCapCents(campaign);
      const remainingLifetime = Math.max(0, cap - campaign.lifetimeSpendCents);
      let maxCharge = remainingLifetime;

      if (isDailyBudget(campaign)) {
        const since = startOfUtcDay();
        const todayRows = await tx.walletTransaction.findMany({
          where: {
            campaignId: input.campaignId,
            type: "AD_SPEND",
            status: "COMPLETED",
            createdAt: { gte: since },
          },
          select: { amountCents: true, metadata: true },
        });
        const todaySpend = todayRows.reduce((sum, row) => {
          const meta = row.metadata as { kind?: string } | null;
          if (meta?.kind === "CAMPAIGN_RESERVE") return sum;
          return sum + Math.abs(row.amountCents);
        }, 0);
        maxCharge = Math.min(maxCharge, Math.max(0, cap - todaySpend));
      }

      const charge = Math.min(input.amountCents, maxCharge);
      if (charge <= 0) {
        await pauseCampaignTx(tx, input.campaignId, "budget_exhausted");
        return { chargedCents: 0, reason: "budget_exhausted" as const };
      }

      let balanceAfter = 0;
      if (prepaid) {
        // Budget already reserved on submit — track usage only, do not debit wallet again.
        const team = await tx.team.findUnique({
          where: { id: input.advertiserTeamId },
          select: { adWalletBalanceCents: true },
        });
        balanceAfter = team?.adWalletBalanceCents ?? 0;
        await tx.adCampaign.update({
          where: { id: input.campaignId },
          data: {
            lifetimeSpendCents: { increment: charge },
            paymentStatus: "funded",
          },
        });
      } else {
        const team = await tx.team.findUnique({
          where: { id: input.advertiserTeamId },
          select: { adWalletBalanceCents: true },
        });
        if (!team || team.adWalletBalanceCents < charge) {
          await pauseCampaignTx(tx, input.campaignId, "insufficient_wallet");
          return { chargedCents: 0, reason: "insufficient_wallet" as const };
        }

        const updated = await tx.team.update({
          where: { id: input.advertiserTeamId },
          data: { adWalletBalanceCents: { decrement: charge } },
          select: { adWalletBalanceCents: true },
        });
        balanceAfter = updated.adWalletBalanceCents;

        await tx.adCampaign.update({
          where: { id: input.campaignId },
          data: {
            lifetimeSpendCents: { increment: charge },
            paymentStatus: "funded",
          },
        });
      }

      await tx.walletTransaction.create({
        data: {
          teamId: input.advertiserTeamId,
          campaignId: input.campaignId,
          type: "AD_SPEND",
          status: "COMPLETED",
          amountCents: charge,
          balanceAfterCents: balanceAfter,
          description: prepaid ? `${input.description} (prepaid budget)` : input.description,
          metadata: {
            kind: input.kind,
            adId: input.adId,
            requestedCents: input.amountCents,
            prepaid,
            ...(input.metadata && typeof input.metadata === "object"
              ? (input.metadata as object)
              : {}),
          },
          completedAt: new Date(),
        },
      });

      const afterCampaign = await tx.adCampaign.findUnique({
        where: { id: input.campaignId },
        select: {
          lifetimeSpendCents: true,
          budgetAmount: true,
          budgetType: true,
          budgetTypeEnum: true,
          platformBudgetUsd: true,
          paymentStatus: true,
        },
      });
      if (afterCampaign) {
        const afterCap = campaignBudgetCapCents(afterCampaign);
        if (afterCampaign.lifetimeSpendCents >= afterCap) {
          await pauseCampaignTx(tx, input.campaignId, "budget_exhausted");
        } else if (!prepaid && balanceAfter <= 0) {
          await pauseCampaignTx(tx, input.campaignId, "insufficient_wallet");
        } else if (isDailyBudget(afterCampaign)) {
          const since = startOfUtcDay();
          const todayRows = await tx.walletTransaction.findMany({
            where: {
              campaignId: input.campaignId,
              type: "AD_SPEND",
              status: "COMPLETED",
              createdAt: { gte: since },
            },
            select: { amountCents: true, metadata: true },
          });
          const todaySpend = todayRows.reduce((sum, row) => {
            const meta = row.metadata as { kind?: string } | null;
            if (meta?.kind === "CAMPAIGN_RESERVE") return sum;
            return sum + Math.abs(row.amountCents);
          }, 0);
          if (todaySpend >= afterCap) {
            await pauseCampaignTx(tx, input.campaignId, "daily_budget_exhausted");
          }
        }
      }

      return { chargedCents: charge };
    });

    return charged;
  } catch (error) {
    console.error("[advertiser-billing]", error);
    return { chargedCents: 0, reason: "charge_failed" };
  }
}

async function pauseCampaignTx(
  tx: Prisma.TransactionClient,
  campaignId: string,
  reason: string,
) {
  const existing = await tx.adCampaign.findUnique({
    where: { id: campaignId },
    select: { metadata: true },
  });
  const prev =
    existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};

  await tx.adCampaign.update({
    where: { id: campaignId },
    data: {
      lifecycleStatus: "PAUSED",
      status: "paused",
      metadata: {
        ...prev,
        pauseReason: reason,
        pausedAt: new Date().toISOString(),
      },
    },
  });
  await tx.ad.updateMany({
    where: { campaignId, status: { in: ["ACTIVE", "APPROVED"] } },
    data: { status: "PAUSED" },
  });
}

/** Charge advertiser CPM in the same batch cadence as publisher credits (every 1,000 imps). */
export async function maybeChargeAdvertiserCpmBatch(input: {
  advertiserTeamId: string;
  campaignId: string;
  adId: string;
  cpmCents: number;
}): Promise<number> {
  if (input.cpmCents <= 0) return 0;

  const validCount = await prisma.adEvent.count({
    where: {
      campaignId: input.campaignId,
      type: "IMPRESSION",
      isValid: true,
    },
  });
  if (validCount === 0 || validCount % 1000 !== 0) return 0;

  const result = await chargeAdvertiserSpend({
    advertiserTeamId: input.advertiserTeamId,
    campaignId: input.campaignId,
    amountCents: input.cpmCents,
    kind: "CPM",
    adId: input.adId,
    description: `CPM ad spend for 1,000 impressions`,
    metadata: { impressions: validCount, rateCents: input.cpmCents },
  });
  return result.chargedCents;
}

export async function chargeAdvertiserClick(input: {
  advertiserTeamId: string;
  campaignId: string;
  adId: string;
  cpcCents: number;
}): Promise<number> {
  if (input.cpcCents <= 0) return 0;
  const result = await chargeAdvertiserSpend({
    advertiserTeamId: input.advertiserTeamId,
    campaignId: input.campaignId,
    amountCents: input.cpcCents,
    kind: "CPC",
    adId: input.adId,
    description: "CPC ad spend for valid click",
    metadata: { rateCents: input.cpcCents },
  });
  return result.chargedCents;
}

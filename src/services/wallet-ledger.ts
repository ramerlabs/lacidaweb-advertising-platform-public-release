import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { usdToCents } from "@/lib/ad-wallet";
import { getAiSettings } from "@/lib/ai-settings";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Delete wallet ledger rows older than 7 days (advertiser + publisher transaction logs). */
export async function purgeOldWalletTransactions(teamId?: string): Promise<number> {
  const cutoff = new Date(Date.now() - WEEK_MS);
  const result = await prisma.walletTransaction.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      ...(teamId ? { teamId } : {}),
    },
  });
  return result.count;
}

export async function listTeamWalletTransactions(teamId: string, take = 50) {
  await purgeOldWalletTransactions(teamId);
  return prisma.walletTransaction.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      status: true,
      amountCents: true,
      balanceAfterCents: true,
      description: true,
      metadata: true,
      campaignId: true,
      createdAt: true,
      completedAt: true,
    },
  });
}

export async function buyAiTokensWithWallet(input: {
  teamId: string;
  userId?: string;
}): Promise<{
  tokensGranted: number;
  chargedCents: number;
  walletBalanceCents: number;
  aiTokenBalance: number;
}> {
  const aiSettings = await getAiSettings();
  if (!aiSettings.aiEnabled) throw new Error("AI tokens are not available");

  const amountUsd = Math.round(aiSettings.aiCreditPackUsd * 100) / 100;
  const chargeCents = usdToCents(amountUsd);
  const tokensGranted = aiSettings.clientPricing.tokensPerPack;
  if (chargeCents <= 0 || tokensGranted <= 0) {
    throw new Error("AI token pack is not configured");
  }

  return prisma.$transaction(async (tx) => {
    const debited = await tx.team.updateMany({
      where: { id: input.teamId, adWalletBalanceCents: { gte: chargeCents } },
      data: {
        adWalletBalanceCents: { decrement: chargeCents },
        aiTokenBalance: { increment: tokensGranted },
        aiEnabled: true,
      },
    });
    if (debited.count === 0) {
      const team = await tx.team.findUnique({
        where: { id: input.teamId },
        select: { adWalletBalanceCents: true },
      });
      if (!team) throw new Error("Team not found");
      throw new Error(
        `Insufficient wallet balance. Need $${amountUsd.toFixed(2)}, have $${(team.adWalletBalanceCents / 100).toFixed(2)}.`,
      );
    }

    const updated = await tx.team.findUniqueOrThrow({
      where: { id: input.teamId },
      select: { adWalletBalanceCents: true, aiTokenBalance: true },
    });

    await tx.walletTransaction.create({
      data: {
        teamId: input.teamId,
        type: "AD_SPEND",
        status: "COMPLETED",
        amountCents: chargeCents,
        balanceAfterCents: updated.adWalletBalanceCents,
        description: `Bought ${tokensGranted.toLocaleString()} AI tokens with wallet`,
        metadata: {
          kind: "AI_TOKEN_WALLET_PURCHASE",
          tokensGranted,
          amountUsd,
          userId: input.userId,
        },
        completedAt: new Date(),
      },
    });

    return {
      tokensGranted,
      chargedCents: chargeCents,
      walletBalanceCents: updated.adWalletBalanceCents,
      aiTokenBalance: updated.aiTokenBalance,
    };
  });
}

/**
 * Atomically debit wallet and mark campaign paymentStatus=reserved.
 * Uses conditional update so concurrent submits cannot overdraw.
 */
export async function reserveCampaignBudget(input: {
  tx: Prisma.TransactionClient;
  teamId: string;
  campaignId: string;
  budgetAmountUsd: number;
  userId?: string;
}): Promise<number> {
  const chargeCents = usdToCents(input.budgetAmountUsd);
  if (chargeCents <= 0) throw new Error("Campaign budget must be greater than zero");

  const debited = await input.tx.team.updateMany({
    where: { id: input.teamId, adWalletBalanceCents: { gte: chargeCents } },
    data: { adWalletBalanceCents: { decrement: chargeCents } },
  });

  if (debited.count === 0) {
    const team = await input.tx.team.findUnique({
      where: { id: input.teamId },
      select: { adWalletBalanceCents: true },
    });
    if (!team) throw new Error("Team not found");
    throw new Error(
      `Insufficient wallet balance. Need $${input.budgetAmountUsd.toFixed(2)}, have $${(team.adWalletBalanceCents / 100).toFixed(2)}. Top up your wallet first.`,
    );
  }

  const updated = await input.tx.team.findUniqueOrThrow({
    where: { id: input.teamId },
    select: { adWalletBalanceCents: true },
  });

  await input.tx.adCampaign.update({
    where: { id: input.campaignId },
    data: {
      paymentStatus: "reserved",
      clientChargeUsd: input.budgetAmountUsd,
      platformBudgetUsd: input.budgetAmountUsd,
    },
  });

  await input.tx.walletTransaction.create({
    data: {
      teamId: input.teamId,
      campaignId: input.campaignId,
      type: "AD_SPEND",
      status: "COMPLETED",
      amountCents: chargeCents,
      balanceAfterCents: updated.adWalletBalanceCents,
      description: `Campaign budget reserved ($${input.budgetAmountUsd.toFixed(2)})`,
      metadata: {
        kind: "CAMPAIGN_RESERVE",
        budgetUsd: input.budgetAmountUsd,
        userId: input.userId,
      },
      completedAt: new Date(),
    },
  });

  return chargeCents;
}

/**
 * Repair campaigns stuck on pending_payment (created before reserve shipped, or failed mid-flow).
 * Deducts budget now so advertisers cannot keep submitting without paying.
 */
export async function repairPendingCampaignReserves(teamId: string, userId?: string): Promise<number> {
  const stuck = await prisma.adCampaign.findMany({
    where: {
      teamId,
      adType: "lacidaweb",
      paymentStatus: "pending_payment",
      lifecycleStatus: { in: ["PENDING_REVIEW", "APPROVED", "ACTIVE", "PAUSED"] },
    },
    select: {
      id: true,
      name: true,
      budgetAmount: true,
      clientChargeUsd: true,
      platformBudgetUsd: true,
    },
    take: 50,
  });

  let repaired = 0;
  for (const campaign of stuck) {
    const budgetUsd =
      campaign.clientChargeUsd || campaign.budgetAmount || campaign.platformBudgetUsd || 0;
    if (budgetUsd <= 0) continue;

    try {
      await prisma.$transaction(async (tx) => {
        // Re-check inside tx — skip if already reserved by a concurrent request.
        const current = await tx.adCampaign.findFirst({
          where: { id: campaign.id, teamId, paymentStatus: "pending_payment" },
          select: { id: true },
        });
        if (!current) return;

        await reserveCampaignBudget({
          tx,
          teamId,
          campaignId: campaign.id,
          budgetAmountUsd: budgetUsd,
          userId,
        });
      });
      repaired += 1;
    } catch {
      // Leave stuck if wallet is insufficient — UI will show pending_payment until topped up.
    }
  }
  return repaired;
}

export async function refundCampaignReserve(input: {
  campaignId: string;
  teamId: string;
  reason: string;
  adminUserId?: string;
}): Promise<number> {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: input.campaignId, teamId: input.teamId },
    select: {
      id: true,
      name: true,
      paymentStatus: true,
      budgetAmount: true,
      clientChargeUsd: true,
      platformBudgetUsd: true,
      lifetimeSpendCents: true,
      metadata: true,
    },
  });
  if (!campaign) throw new Error("Campaign not found");

  if (!["reserved", "funded", "paid"].includes(campaign.paymentStatus)) {
    return 0;
  }

  if (campaign.paymentStatus === "refunded") return 0;

  const reservedUsd =
    campaign.clientChargeUsd || campaign.budgetAmount || campaign.platformBudgetUsd || 0;
  const reservedCents = usdToCents(reservedUsd);
  const refundCents = Math.max(0, reservedCents - Math.max(0, campaign.lifetimeSpendCents));
  if (refundCents <= 0) {
    await prisma.adCampaign.update({
      where: { id: campaign.id },
      data: { paymentStatus: "refunded" },
    });
    return 0;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.team.update({
      where: { id: input.teamId },
      data: { adWalletBalanceCents: { increment: refundCents } },
      select: { adWalletBalanceCents: true },
    });

    await tx.adCampaign.update({
      where: { id: campaign.id },
      data: { paymentStatus: "refunded" },
    });

    await tx.walletTransaction.create({
      data: {
        teamId: input.teamId,
        campaignId: campaign.id,
        type: "REFUND",
        status: "COMPLETED",
        amountCents: refundCents,
        balanceAfterCents: updated.adWalletBalanceCents,
        description: `Refund for rejected campaign "${campaign.name}"`,
        metadata: {
          kind: "CAMPAIGN_REJECT_REFUND",
          reason: input.reason,
          reservedCents,
          lifetimeSpendCents: campaign.lifetimeSpendCents,
          adminUserId: input.adminUserId,
        },
        completedAt: new Date(),
      },
    });

    return refundCents;
  });
}

/** True when campaign budget was prepaid on submit — delivery should not debit wallet again. */
export function isCampaignPrepaid(paymentStatus: string): boolean {
  return ["reserved", "funded", "paid"].includes(paymentStatus);
}

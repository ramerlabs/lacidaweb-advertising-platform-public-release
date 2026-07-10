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
    const team = await tx.team.findUnique({
      where: { id: input.teamId },
      select: { adWalletBalanceCents: true, aiTokenBalance: true },
    });
    if (!team) throw new Error("Team not found");
    if (team.adWalletBalanceCents < chargeCents) {
      throw new Error(
        `Insufficient wallet balance. Need $${amountUsd.toFixed(2)}, have $${(team.adWalletBalanceCents / 100).toFixed(2)}.`,
      );
    }

    const updated = await tx.team.update({
      where: { id: input.teamId },
      data: {
        adWalletBalanceCents: { decrement: chargeCents },
        aiTokenBalance: { increment: tokensGranted },
        aiEnabled: true,
      },
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

export async function reserveCampaignBudget(input: {
  tx: Prisma.TransactionClient;
  teamId: string;
  campaignId: string;
  budgetAmountUsd: number;
  userId?: string;
}): Promise<number> {
  const chargeCents = usdToCents(input.budgetAmountUsd);
  if (chargeCents <= 0) throw new Error("Campaign budget must be greater than zero");

  const team = await input.tx.team.findUnique({
    where: { id: input.teamId },
    select: { adWalletBalanceCents: true },
  });
  if (!team) throw new Error("Team not found");
  if (team.adWalletBalanceCents < chargeCents) {
    throw new Error(
      `Insufficient wallet balance. Need $${input.budgetAmountUsd.toFixed(2)}, have $${(team.adWalletBalanceCents / 100).toFixed(2)}. Top up your wallet first.`,
    );
  }

  const updated = await input.tx.team.update({
    where: { id: input.teamId },
    data: { adWalletBalanceCents: { decrement: chargeCents } },
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

  // Already refunded
  if (campaign.paymentStatus === "refunded") return 0;

  const reservedUsd =
    campaign.clientChargeUsd || campaign.budgetAmount || campaign.platformBudgetUsd || 0;
  const reservedCents = usdToCents(reservedUsd);
  // Delivery may have tracked lifetimeSpend against prepaid budget; refund unused portion.
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

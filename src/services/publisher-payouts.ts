import type { PaymentMethod, PublisherPayoutStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdsSettings } from "@/lib/ads-settings";
import { getPaymentSettings } from "@/lib/payment-settings";
import { paymentMethodLabel, type ClientPaymentMethod } from "@/lib/payment-methods";

export type PayoutMethodOption = {
  method: ClientPaymentMethod;
  label: string;
  hint: string;
};

export async function getAvailablePayoutMethods(): Promise<PayoutMethodOption[]> {
  const settings = await getPaymentSettings();
  const options: PayoutMethodOption[] = [];

  if (settings.usdtEnabled) {
    options.push({
      method: "USDT",
      label: paymentMethodLabel("USDT"),
      hint: "Provide your USDT TRC-20 wallet address",
    });
  }
  if (settings.paypalEnabled) {
    options.push({
      method: "PAYPAL",
      label: paymentMethodLabel("PAYPAL"),
      hint: "Provide the PayPal email that should receive the payout",
    });
  }
  if (settings.gcashEnabled) {
    options.push({
      method: "GCASH",
      label: paymentMethodLabel("GCASH"),
      hint: "Provide your GCash mobile number",
    });
  }
  if (settings.usBankEnabled) {
    options.push({
      method: "US_BANK",
      label: paymentMethodLabel("US_BANK"),
      hint: "Provide bank name, account name, account number, and routing number",
    });
  }

  if (!options.length) {
    return [];
  }

  return options;
}

export async function getPublisherEarningsSummary(teamId: string) {
  const [team, settings, validImpressions, validClicks, fraudBlocked, pendingPayouts] =
    await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        select: {
          publisherBalanceCents: true,
          publisherLifetimeEarnedCents: true,
          publisherLifetimePaidCents: true,
        },
      }),
      getAdsSettings(),
      prisma.adEvent.count({ where: { teamId, type: "IMPRESSION", isValid: true } }),
      prisma.adEvent.count({ where: { teamId, type: "CLICK", isValid: true } }),
      prisma.adEvent.count({ where: { teamId, isValid: false } }),
      prisma.publisherPayout.aggregate({
        where: { teamId, status: { in: ["PENDING", "APPROVED"] } },
        _sum: { amountCents: true },
      }),
    ]);

  const balanceCents = team?.publisherBalanceCents ?? 0;
  const pendingCents = pendingPayouts._sum.amountCents ?? 0;
  const availableToRequestCents = Math.max(0, balanceCents - pendingCents);

  return {
    balanceCents,
    lifetimeEarnedCents: team?.publisherLifetimeEarnedCents ?? 0,
    lifetimePaidCents: team?.publisherLifetimePaidCents ?? 0,
    pendingPayoutCents: pendingCents,
    availableToRequestCents,
    validImpressions,
    validClicks,
    fraudBlocked,
    rates: {
      cpmCents: settings.publisherCpmCents,
      cpcCents: settings.publisherCpcCents,
      minPayoutCents: settings.publisherMinPayoutCents,
    },
    canRequestPayout: availableToRequestCents >= settings.publisherMinPayoutCents,
  };
}

export async function listPublisherPayouts(teamId: string) {
  return prisma.publisherPayout.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function createPublisherPayoutRequest(input: {
  teamId: string;
  amountCents: number;
  method: PaymentMethod;
  payoutDetails: string;
  notes?: string;
}) {
  const settings = await getAdsSettings();
  const methods = await getAvailablePayoutMethods();
  const allowed = methods.some((m) => m.method === input.method);
  if (!allowed) {
    throw new Error("Selected payout method is not available");
  }

  if (input.amountCents < settings.publisherMinPayoutCents) {
    throw new Error(
      `Minimum payout is $${(settings.publisherMinPayoutCents / 100).toFixed(2)}`,
    );
  }

  const details = input.payoutDetails.trim();
  if (details.length < 5) {
    throw new Error("Enter your payout destination details");
  }

  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({
      where: { id: input.teamId },
      select: { publisherBalanceCents: true },
    });
    if (!team) throw new Error("Team not found");

    const pending = await tx.publisherPayout.aggregate({
      where: { teamId: input.teamId, status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amountCents: true },
    });
    const reserved = pending._sum.amountCents ?? 0;
    const available = team.publisherBalanceCents - reserved;
    if (input.amountCents > available) {
      throw new Error("Amount exceeds available balance");
    }

    return tx.publisherPayout.create({
      data: {
        teamId: input.teamId,
        amountCents: input.amountCents,
        method: input.method,
        payoutDetails: details,
        notes: input.notes?.trim() || null,
        status: "PENDING",
      },
    });
  });
}

export async function reviewPublisherPayout(input: {
  payoutId: string;
  reviewerId: string;
  action: "APPROVE" | "REJECT" | "MARK_PAID";
  adminNotes?: string;
  rejectionReason?: string;
}) {
  const payout = await prisma.publisherPayout.findUnique({ where: { id: input.payoutId } });
  if (!payout) throw new Error("Payout not found");

  if (input.action === "APPROVE") {
    if (payout.status !== "PENDING") throw new Error("Only pending payouts can be approved");
    return prisma.publisherPayout.update({
      where: { id: payout.id },
      data: {
        status: "APPROVED",
        reviewedById: input.reviewerId,
        reviewedAt: new Date(),
        adminNotes: input.adminNotes?.trim() || null,
      },
    });
  }

  if (input.action === "REJECT") {
    if (payout.status !== "PENDING" && payout.status !== "APPROVED") {
      throw new Error("Payout cannot be rejected");
    }
    return prisma.publisherPayout.update({
      where: { id: payout.id },
      data: {
        status: "REJECTED",
        reviewedById: input.reviewerId,
        reviewedAt: new Date(),
        rejectionReason: input.rejectionReason?.trim() || "Rejected by admin",
        adminNotes: input.adminNotes?.trim() || null,
      },
    });
  }

  // MARK_PAID — deduct balance and ledger
  if (payout.status !== "PENDING" && payout.status !== "APPROVED") {
    throw new Error("Payout cannot be marked paid");
  }

  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({
      where: { id: payout.teamId },
      select: { publisherBalanceCents: true },
    });
    if (!team) throw new Error("Team not found");
    if (team.publisherBalanceCents < payout.amountCents) {
      throw new Error("Publisher balance is lower than payout amount");
    }

    const updatedTeam = await tx.team.update({
      where: { id: payout.teamId },
      data: {
        publisherBalanceCents: { decrement: payout.amountCents },
        publisherLifetimePaidCents: { increment: payout.amountCents },
      },
      select: { publisherBalanceCents: true },
    });

    await tx.walletTransaction.create({
      data: {
        teamId: payout.teamId,
        type: "PUBLISHER_PAYOUT",
        status: "COMPLETED",
        amountCents: -payout.amountCents,
        balanceAfterCents: updatedTeam.publisherBalanceCents,
        method: payout.method,
        description: `Publisher payout via ${payout.method}`,
        metadata: { payoutId: payout.id },
        completedAt: new Date(),
      },
    });

    return tx.publisherPayout.update({
      where: { id: payout.id },
      data: {
        status: "PAID" satisfies PublisherPayoutStatus,
        reviewedById: input.reviewerId,
        reviewedAt: new Date(),
        paidAt: new Date(),
        adminNotes: input.adminNotes?.trim() || payout.adminNotes,
      },
    });
  });
}

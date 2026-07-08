import { prisma } from "@/lib/prisma";
import type { Payment } from "@prisma/client";
import { notifyAdminPaymentCompleted } from "@/services/admin-notify";
import { publishAdCampaignToZernio } from "@/services/ad-publish";

export async function activatePayment(
  payment: Payment & { subscriptionId: string | null },
  opts?: { txHash?: string; notes?: string },
) {
  if (payment.status === "PAID") {
    return payment;
  }

  if (opts?.txHash) {
    const duplicate = await prisma.payment.findFirst({
      where: {
        txHash: opts.txHash,
        status: "PAID",
        NOT: { id: payment.id },
      },
    });
    if (duplicate) {
      throw new Error("This transaction hash was already used for another payment");
    }
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "PAID",
      txHash: opts?.txHash ?? payment.txHash,
      verifiedAt: new Date(),
      notes: opts?.notes ?? payment.notes,
    },
  });

  if (payment.subscriptionId) {
    const periodMs =
      payment.interval === "YEARLY" ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

    await prisma.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + periodMs),
      },
    });
  }

  if (payment.purpose === "AI_CREDITS" && payment.aiTokensGranted) {
    await prisma.team.update({
      where: { id: payment.teamId },
      data: {
        aiTokenBalance: { increment: payment.aiTokensGranted },
        aiEnabled: true,
      },
    });
  }

  if (payment.purpose === "AD_WALLET" && payment.adWalletTopUpCents) {
    await prisma.team.update({
      where: { id: payment.teamId },
      data: { adWalletBalanceCents: { increment: payment.adWalletTopUpCents } },
    });
  }

  if (payment.purpose === "AD_CAMPAIGN" && payment.adCampaignId) {
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: payment.adCampaignId },
    });
    if (campaign && !campaign.zernioAdId && campaign.paymentStatus === "pending_payment") {
      await publishAdCampaignToZernio(payment.adCampaignId);
      await prisma.adCampaign.update({
        where: { id: payment.adCampaignId },
        data: {
          paymentStatus: "checkout_paid",
          paymentId: payment.id,
        },
      });
      await prisma.auditLog.create({
        data: {
          teamId: payment.teamId,
          action: "ads.campaign.published",
          message: `Ad "${campaign.name}" published after payment confirmed`,
          metadata: { adCampaignId: campaign.id, paymentId: payment.id },
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      teamId: payment.teamId,
      action: "payment.activated",
      message: `Payment ${payment.id} activated${opts?.txHash ? ` via TX ${opts.txHash}` : ""}`,
      metadata: { paymentId: payment.id, txHash: opts?.txHash },
    },
  });

  notifyAdminPaymentCompleted({
    teamId: payment.teamId,
    method: payment.method,
    amount: payment.amount,
    paymentId: payment.id,
    txHash: updated.txHash,
  });

  return updated;
}

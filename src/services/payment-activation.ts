import { prisma } from "@/lib/prisma";
import type { Payment } from "@prisma/client";
import { notifyAdminPaymentCompleted } from "@/services/admin-notify";

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

  if (payment.purpose === "AI_CREDITS" && payment.aiCreditsCents) {
    await prisma.team.update({
      where: { id: payment.teamId },
      data: { aiBalanceCents: { increment: payment.aiCreditsCents } },
    });
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

import { prisma } from "@/lib/prisma";
import { activatePayment } from "@/services/payment-activation";
import { verifyTrc20UsdtPayment, getUsdtWalletAddress } from "@/services/crypto-verify";

export async function verifyAndActivateUsdtPayment(paymentId: string, txHash: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { subscription: true },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.method !== "USDT") {
    throw new Error("This payment is not a USDT payment");
  }

  if (payment.status === "PAID") {
    return { payment, alreadyPaid: true, message: "Payment already confirmed" };
  }

  if (!payment.usdtAmount || payment.usdtAmount <= 0) {
    throw new Error("USDT amount missing on payment record");
  }

  const wallet = await getUsdtWalletAddress();
  const verification = await verifyTrc20UsdtPayment({
    txHash,
    walletAddress: wallet,
    expectedUsdt: payment.usdtAmount,
  });

  if (!verification.ok) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        txHash,
        notes: verification.message,
      },
    });
    throw new Error(verification.message);
  }

  const activated = await activatePayment(payment, {
    txHash,
    notes: `Auto-verified USDT payment. Received ${verification.receivedUsdt} USDT.`,
  });

  return {
    payment: activated,
    alreadyPaid: false,
    message:
      payment.purpose === "AI_CREDITS"
        ? `Payment verified. ${(payment.aiTokensGranted || 0).toLocaleString()} AI tokens added to your balance.`
        : "Payment verified and subscription activated",
  };
}

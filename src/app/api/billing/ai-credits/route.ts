import { NextResponse } from "next/server";
import { z } from "zod";
import type { BillingInterval, PaymentMethod } from "@prisma/client";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentInstructions } from "@/lib/billing";
import { assertPaymentMethodEnabled } from "@/lib/payment-settings";
import { getAiSettings } from "@/lib/ai-settings";
import { getUsdtWalletAddress, usdToUsdt, usdtPaymentInstructions } from "@/services/crypto-verify";
import { notifyAdminPaymentCreated } from "@/services/admin-notify";

const schema = z.object({
  teamId: z.string().min(1),
  method: z.enum(["USDT", "PAYPAL", "GCASH"]),
  proofUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);
    await assertPaymentMethodEnabled(body.method as PaymentMethod);

    const aiSettings = await getAiSettings();
    if (!aiSettings.aiEnabled) {
      return NextResponse.json({ error: "AI credits are not available" }, { status: 400 });
    }

    const amount = Math.round(aiSettings.aiCreditPackUsd);
    const aiCreditsCents = aiSettings.aiCreditsPerPackCents;
    const isUsdt = body.method === "USDT";

    let usdtAmount: number | undefined;
    let instructions = await getPaymentInstructions(body.method as PaymentMethod);

    if (isUsdt) {
      usdtAmount = await usdToUsdt(amount);
      const wallet = await getUsdtWalletAddress();
      instructions = usdtPaymentInstructions(usdtAmount, wallet);
    }

    const payment = await prisma.payment.create({
      data: {
        teamId: body.teamId,
        method: body.method as PaymentMethod,
        status: "PENDING",
        amount,
        usdtAmount,
        interval: "MONTHLY" as BillingInterval,
        currency: "USD",
        purpose: "AI_CREDITS",
        aiCreditsCents,
        proofUrl: body.proofUrl,
        notes: `AI credit pack: $${(aiCreditsCents / 100).toFixed(2)} credits. ${instructions}`,
      },
    });

    notifyAdminPaymentCreated({
      teamId: body.teamId,
      method: body.method,
      amount,
      planId: "ai-credits",
      paymentId: payment.id,
    });

    return NextResponse.json({
      payment,
      instructions,
      usdtAmount,
      aiCreditsCents,
      walletAddress: isUsdt ? await getUsdtWalletAddress() : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

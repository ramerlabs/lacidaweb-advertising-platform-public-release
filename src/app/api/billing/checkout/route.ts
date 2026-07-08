import { NextResponse } from "next/server";
import { z } from "zod";
import type { BillingInterval, PaymentMethod } from "@prisma/client";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanAccountLimit, getPlanAmount, formatCheckoutInstructions } from "@/lib/billing";
import { getPlanById } from "@/lib/pricing";
import { assertPaymentMethodEnabled } from "@/lib/payment-settings";
import { getUsdtWalletAddress, usdToUsdt, usdtPaymentInstructions } from "@/services/crypto-verify";
import { notifyAdminPaymentCreated } from "@/services/admin-notify";

const schema = z.object({
  teamId: z.string().min(1),
  planId: z.enum(["starter", "growth", "scale"]),
  interval: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  method: z.enum(["USDT", "PAYPAL", "GCASH"]),
  proofUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);
    await assertPaymentMethodEnabled(body.method as PaymentMethod);

    const amount = getPlanAmount(body.planId, body.interval as BillingInterval);
    const accountLimit = getPlanAccountLimit(body.planId);
    const isUsdt = body.method === "USDT";

    let usdtAmount: number | undefined;
    const plan = getPlanById(body.planId);
    let instructions = await formatCheckoutInstructions(body.method as PaymentMethod, {
      amountUsd: amount,
      planName: plan.name,
    });

    if (isUsdt) {
      usdtAmount = await usdToUsdt(amount);
      const wallet = await getUsdtWalletAddress();
      instructions = `${instructions}\n\n${usdtPaymentInstructions(usdtAmount, wallet)}`;
    }

    const subscription = await prisma.subscription.upsert({
      where: { teamId: body.teamId },
      create: {
        teamId: body.teamId,
        planId: body.planId,
        accountLimit,
        interval: body.interval as BillingInterval,
        amount,
        status: "TRIAL",
        currentPeriodStart: new Date(),
      },
      update: {
        planId: body.planId,
        accountLimit,
        interval: body.interval as BillingInterval,
        amount,
        status: "PAST_DUE",
      },
    });

    const payment = await prisma.payment.create({
      data: {
        teamId: body.teamId,
        subscriptionId: subscription.id,
        method: body.method as PaymentMethod,
        status: "PENDING",
        amount,
        usdtAmount,
        interval: body.interval as BillingInterval,
        currency: "USD",
        proofUrl: body.proofUrl,
        notes: instructions,
      },
    });

    notifyAdminPaymentCreated({
      teamId: body.teamId,
      method: body.method,
      amount,
      planId: body.planId,
      paymentId: payment.id,
    });

    return NextResponse.json({
      payment,
      instructions,
      usdtAmount,
      walletAddress: isUsdt ? await getUsdtWalletAddress() : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

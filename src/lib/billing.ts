import type { PaymentMethod } from "@prisma/client";
import { getPlanById } from "@/lib/pricing";
import { getPaymentSettings } from "@/lib/payment-settings";

export function getPlanAmount(planId: string, interval: import("@prisma/client").BillingInterval): number {
  const plan = getPlanById(planId);
  return interval === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice;
}

export function getPlanAccountLimit(planId: string): number {
  return getPlanById(planId).accountLimit;
}

export async function getPaymentInstructions(method: PaymentMethod): Promise<string> {
  const settings = await getPaymentSettings();
  if (method === "USDT") return settings.usdtInstructions;
  if (method === "PAYPAL") return settings.paypalInstructions;
  return settings.gcashInstructions;
}

type CheckoutContext = {
  amountUsd: number;
  aiCreditsCents?: number;
  planName?: string;
};

export async function formatCheckoutInstructions(
  method: PaymentMethod,
  context: CheckoutContext,
): Promise<string> {
  const settings = await getPaymentSettings();
  const amount = context.amountUsd.toFixed(2);
  const lines: string[] = [];

  if (context.aiCreditsCents) {
    lines.push(
      `AI credit pack: pay $${amount} → receive $${(context.aiCreditsCents / 100).toFixed(2)} in AI credits after approval.`,
    );
  } else if (context.planName) {
    lines.push(`Subscription: ${context.planName} — pay $${amount}.`);
  } else {
    lines.push(`Amount to pay: $${amount}.`);
  }

  if (method === "PAYPAL") {
    if (settings.paypalEmail) {
      lines.push(`Send $${amount} to PayPal: ${settings.paypalEmail}`);
    } else {
      lines.push("PayPal email not configured — contact the platform admin.");
    }
    if (settings.paypalInstructions) lines.push(settings.paypalInstructions);
    lines.push("Payment is reviewed manually. Credits or subscription activate after admin confirms.");
  } else if (method === "GCASH") {
    if (settings.gcashNumber) {
      lines.push(`Send $${amount} (or PHP equivalent) to GCash: ${settings.gcashNumber}`);
    } else {
      lines.push("GCash number not configured — contact the platform admin.");
    }
    if (settings.gcashInstructions) lines.push(settings.gcashInstructions);
    lines.push("Payment is reviewed manually. Credits or subscription activate after admin confirms.");
  } else if (method === "USDT") {
    if (settings.usdtInstructions) lines.push(settings.usdtInstructions);
  }

  return lines.join("\n\n");
}

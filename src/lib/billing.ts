import type { BillingInterval, PaymentMethod } from "@prisma/client";
import { getPlanById } from "@/lib/pricing";
import { getPaymentSettings } from "@/lib/payment-settings";

export function getPlanAmount(planId: string, interval: BillingInterval): number {
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
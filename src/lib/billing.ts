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
  if (method === "US_BANK") return settings.usBankInstructions;
  return settings.gcashInstructions;
}

type CheckoutContext = {
  amountUsd: number;
  aiTokensGranted?: number;
  planName?: string;
  adCampaignName?: string;
  adWalletTopUpUsd?: number;
};

export async function formatCheckoutInstructions(
  method: PaymentMethod,
  context: CheckoutContext,
): Promise<string> {
  const settings = await getPaymentSettings();
  const amount = context.amountUsd.toFixed(2);
  const lines: string[] = [];

  if (context.aiTokensGranted) {
    lines.push(
      `AI token pack: pay $${amount} → receive ${context.aiTokensGranted.toLocaleString()} tokens after payment is confirmed.`,
    );
  } else if (context.adCampaignName) {
    lines.push(
      `Ad campaign "${context.adCampaignName}": pay $${amount} (includes platform fee). Your ad publishes after payment is confirmed.`,
    );
  } else if (context.adWalletTopUpUsd) {
    lines.push(
      `Ad wallet top-up: pay $${amount} → $${context.adWalletTopUpUsd.toFixed(2)} added to your prepaid ad balance after confirmation.`,
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
    lines.push("Payment is reviewed manually. Tokens or subscription activate after admin confirms.");
  } else if (method === "GCASH") {
    if (settings.gcashNumber) {
      lines.push(`Send $${amount} (or PHP equivalent) to GCash: ${settings.gcashNumber}`);
    } else {
      lines.push("GCash number not configured — contact the platform admin.");
    }
    if (settings.gcashInstructions) lines.push(settings.gcashInstructions);
    lines.push("Payment is reviewed manually. Tokens or subscription activate after admin confirms.");
  } else if (method === "US_BANK") {
    if (settings.usBankName && settings.usBankAccountNumber && settings.usBankRoutingNumber) {
      lines.push(`Bank: ${settings.usBankName}`);
      if (settings.usBankAccountName) lines.push(`Account name: ${settings.usBankAccountName}`);
      lines.push(`Routing number: ${settings.usBankRoutingNumber}`);
      lines.push(`Account number: ${settings.usBankAccountNumber}`);
      if (settings.usBankAccountType) lines.push(`Account type: ${settings.usBankAccountType}`);
      lines.push(`Amount: $${amount} USD`);
    } else {
      lines.push("US bank details not configured — contact the platform admin.");
    }
    if (settings.usBankInstructions) lines.push(settings.usBankInstructions);
    lines.push(
      "After you pay, enter your bank transfer reference on the billing page so we can match your payment.",
    );
  } else if (method === "USDT") {
    if (settings.usdtInstructions) lines.push(settings.usdtInstructions);
  }

  return lines.join("\n\n");
}

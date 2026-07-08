import type { BillingInterval, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { usdToCents } from "@/lib/ad-wallet";
import { formatCheckoutInstructions } from "@/lib/billing";
import { getAdsSettings } from "@/lib/ads-settings";
import { assertPaymentMethodEnabled, getPaymentSettings, getUsBankDetails } from "@/lib/payment-settings";
import { getUsdtWalletAddress, usdToUsdt, usdtPaymentInstructions } from "@/services/crypto-verify";
import { notifyAdminPaymentCreated } from "@/services/admin-notify";

export async function createAdWalletTopUpPayment(input: {
  teamId: string;
  method: PaymentMethod;
  proofUrl?: string;
}) {
  await assertPaymentMethodEnabled(input.method);

  const settings = await getAdsSettings();
  const amount = Math.round(settings.adWalletTopUpUsd);
  const adWalletTopUpCents = usdToCents(settings.adWalletTopUpUsd);
  const isUsdt = input.method === "USDT";

  let usdtAmount: number | undefined;
  let instructions = await formatCheckoutInstructions(input.method, {
    amountUsd: amount,
    adWalletTopUpUsd: settings.adWalletTopUpUsd,
  });

  if (isUsdt) {
    usdtAmount = await usdToUsdt(amount);
    const wallet = await getUsdtWalletAddress();
    instructions = `${instructions}\n\n${usdtPaymentInstructions(usdtAmount, wallet)}`;
  }

  const payment = await prisma.payment.create({
    data: {
      teamId: input.teamId,
      method: input.method,
      status: "PENDING",
      amount,
      usdtAmount,
      interval: "MONTHLY" as BillingInterval,
      currency: "USD",
      purpose: "AD_WALLET",
      adWalletTopUpCents,
      proofUrl: input.proofUrl,
      notes: instructions,
    },
  });

  notifyAdminPaymentCreated({
    teamId: input.teamId,
    method: input.method,
    amount,
    planId: "ad-wallet",
    paymentId: payment.id,
  });

  return {
    payment,
    instructions,
    usdtAmount,
    adWalletTopUpCents,
    walletAddress: isUsdt ? await getUsdtWalletAddress() : undefined,
    usBank: input.method === "US_BANK" ? getUsBankDetails(await getPaymentSettings()) : undefined,
  };
}

export async function createAdCampaignPayment(input: {
  teamId: string;
  campaignId: string;
  method: PaymentMethod;
  proofUrl?: string;
}) {
  await assertPaymentMethodEnabled(input.method);

  const campaign = await prisma.adCampaign.findFirst({
    where: { id: input.campaignId, teamId: input.teamId },
  });
  if (!campaign) throw new Error("Ad campaign not found");
  if (campaign.paymentStatus !== "pending_payment") {
    throw new Error("This ad is not awaiting payment");
  }
  if (campaign.zernioAdId) throw new Error("This ad was already published");

  const existingPending = await prisma.payment.findFirst({
    where: {
      adCampaignId: campaign.id,
      status: "PENDING",
      purpose: "AD_CAMPAIGN",
    },
  });
  if (existingPending) {
    return getPaymentCheckoutPayload(existingPending, input.method);
  }

  const amount = Math.ceil(campaign.clientChargeUsd);
  const isUsdt = input.method === "USDT";

  let usdtAmount: number | undefined;
  let instructions = await formatCheckoutInstructions(input.method, {
    amountUsd: amount,
    adCampaignName: campaign.name,
  });

  if (isUsdt) {
    usdtAmount = await usdToUsdt(amount);
    const wallet = await getUsdtWalletAddress();
    instructions = `${instructions}\n\n${usdtPaymentInstructions(usdtAmount, wallet)}`;
  }

  const payment = await prisma.payment.create({
    data: {
      teamId: input.teamId,
      method: input.method,
      status: "PENDING",
      amount,
      usdtAmount,
      interval: "MONTHLY" as BillingInterval,
      currency: "USD",
      purpose: "AD_CAMPAIGN",
      adCampaignId: campaign.id,
      proofUrl: input.proofUrl,
      notes: instructions,
    },
  });

  await prisma.adCampaign.update({
    where: { id: campaign.id },
    data: { paymentId: payment.id },
  });

  notifyAdminPaymentCreated({
    teamId: input.teamId,
    method: input.method,
    amount,
    planId: "ad-campaign",
    paymentId: payment.id,
  });

  return getPaymentCheckoutPayload(payment, input.method, {
    instructions,
    usdtAmount,
    campaign,
  });
}

async function getPaymentCheckoutPayload(
  payment: {
    id: string;
    amount: number;
    usdtAmount: number | null;
    notes: string | null;
    method: PaymentMethod;
  },
  method: PaymentMethod,
  extras?: {
    instructions?: string;
    usdtAmount?: number;
    campaign?: { id: string; name: string; clientChargeUsd: number };
  },
) {
  const instructions = extras?.instructions ?? payment.notes ?? "";
  const isUsdt = method === "USDT";
  return {
    payment,
    instructions,
    usdtAmount: extras?.usdtAmount ?? payment.usdtAmount ?? undefined,
    campaign: extras?.campaign,
    walletAddress: isUsdt ? await getUsdtWalletAddress() : undefined,
    usBank: method === "US_BANK" ? getUsBankDetails(await getPaymentSettings()) : undefined,
  };
}

export async function getAdCampaignCheckoutContext(campaignId: string, teamId: string) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, teamId },
  });
  if (!campaign) throw new Error("Ad campaign not found");
  if (campaign.paymentStatus !== "pending_payment") {
    throw new Error("This ad is not awaiting payment");
  }
  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      clientChargeUsd: campaign.clientChargeUsd,
      platformBudgetUsd: campaign.platformBudgetUsd,
      budgetAmount: campaign.budgetAmount,
      budgetType: campaign.budgetType,
    },
    amountUsd: Math.ceil(campaign.clientChargeUsd),
  };
}

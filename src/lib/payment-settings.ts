import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { RECOMMENDED_USDT_INSTRUCTIONS } from "@/lib/payment-instructions";
import type { UsBankDetails } from "@/lib/payment-methods";

export type PaymentSettingsData = {
  usdtEnabled: boolean;
  paypalEnabled: boolean;
  gcashEnabled: boolean;
  usBankEnabled: boolean;
  usdtTrc20Wallet: string;
  paypalEmail: string;
  gcashNumber: string;
  usBankName: string;
  usBankAccountName: string;
  usBankAccountNumber: string;
  usBankRoutingNumber: string;
  usBankAccountType: string;
  usdtInstructions: string;
  paypalInstructions: string;
  gcashInstructions: string;
  usBankInstructions: string;
  usdtPerUsd: number | null;
};

const DEFAULTS: PaymentSettingsData = {
  usdtEnabled: true,
  paypalEnabled: true,
  gcashEnabled: true,
  usBankEnabled: false,
  usdtTrc20Wallet: "",
  paypalEmail: "",
  gcashNumber: "",
  usBankName: "",
  usBankAccountName: "",
  usBankAccountNumber: "",
  usBankRoutingNumber: "",
  usBankAccountType: "Checking",
  usdtInstructions: RECOMMENDED_USDT_INSTRUCTIONS,
  paypalInstructions:
    "Include your account email in the PayPal payment note so we can match your payment.",
  gcashInstructions:
    "Send the exact amount shown. Screenshot your receipt and contact support if approval is delayed.",
  usBankInstructions:
    "Wire or ACH the exact USD amount. Enter your bank transfer reference below after payment so we can match it.",
  usdtPerUsd: null,
};

function envFallbacks(): Omit<
  PaymentSettingsData,
  "usdtEnabled" | "paypalEnabled" | "gcashEnabled" | "usBankEnabled"
> {
  const usdtPerUsd = Number(process.env.USDT_PER_USD);
  return {
    usdtTrc20Wallet:
      process.env.USDT_TRC20_WALLET?.trim() ||
      process.env.USDT_WALLET_ADDRESS?.trim() ||
      "",
    paypalEmail: process.env.PAYPAL_EMAIL?.trim() || "",
    gcashNumber: process.env.GCASH_NUMBER?.trim() || "",
    usBankName: process.env.US_BANK_NAME?.trim() || "",
    usBankAccountName: process.env.US_BANK_ACCOUNT_NAME?.trim() || "",
    usBankAccountNumber: process.env.US_BANK_ACCOUNT_NUMBER?.trim() || "",
    usBankRoutingNumber: process.env.US_BANK_ROUTING_NUMBER?.trim() || "",
    usBankAccountType: process.env.US_BANK_ACCOUNT_TYPE?.trim() || "Checking",
    usdtInstructions:
      process.env.USDT_PAYMENT_INSTRUCTIONS?.trim() || DEFAULTS.usdtInstructions,
    paypalInstructions:
      process.env.PAYPAL_PAYMENT_INSTRUCTIONS?.trim() || DEFAULTS.paypalInstructions,
    gcashInstructions:
      process.env.GCASH_PAYMENT_INSTRUCTIONS?.trim() || DEFAULTS.gcashInstructions,
    usBankInstructions:
      process.env.US_BANK_PAYMENT_INSTRUCTIONS?.trim() || DEFAULTS.usBankInstructions,
    usdtPerUsd: usdtPerUsd > 0 ? usdtPerUsd : null,
  };
}

function mergeSettings(
  row: {
    usdtEnabled: boolean;
    paypalEnabled: boolean;
    gcashEnabled: boolean;
    usBankEnabled?: boolean;
    usdtTrc20Wallet: string | null;
    paypalEmail?: string | null;
    gcashNumber?: string | null;
    usBankName?: string | null;
    usBankAccountName?: string | null;
    usBankAccountNumber?: string | null;
    usBankRoutingNumber?: string | null;
    usBankAccountType?: string | null;
    usdtInstructions: string | null;
    paypalInstructions: string | null;
    gcashInstructions: string | null;
    usBankInstructions?: string | null;
    usdtPerUsd: number | null;
  } | null,
): PaymentSettingsData {
  const env = envFallbacks();
  if (!row) return { ...DEFAULTS, ...env };

  return {
    usdtEnabled: row.usdtEnabled,
    paypalEnabled: row.paypalEnabled,
    gcashEnabled: row.gcashEnabled,
    usBankEnabled: row.usBankEnabled ?? DEFAULTS.usBankEnabled,
    usdtTrc20Wallet: row.usdtTrc20Wallet?.trim() || env.usdtTrc20Wallet,
    paypalEmail: row.paypalEmail?.trim() || env.paypalEmail,
    gcashNumber: row.gcashNumber?.trim() || env.gcashNumber,
    usBankName: row.usBankName?.trim() || env.usBankName,
    usBankAccountName: row.usBankAccountName?.trim() || env.usBankAccountName,
    usBankAccountNumber: row.usBankAccountNumber?.trim() || env.usBankAccountNumber,
    usBankRoutingNumber: row.usBankRoutingNumber?.trim() || env.usBankRoutingNumber,
    usBankAccountType: row.usBankAccountType?.trim() || env.usBankAccountType,
    usdtInstructions: row.usdtInstructions?.trim() || env.usdtInstructions,
    paypalInstructions: row.paypalInstructions?.trim() || env.paypalInstructions,
    gcashInstructions: row.gcashInstructions?.trim() || env.gcashInstructions,
    usBankInstructions: row.usBankInstructions?.trim() || env.usBankInstructions,
    usdtPerUsd: row.usdtPerUsd ?? env.usdtPerUsd,
  };
}

export async function getPaymentSettings(): Promise<PaymentSettingsData> {
  if (!hasModelDelegate(prisma, "paymentSettings")) {
    return { ...DEFAULTS, ...envFallbacks() };
  }

  try {
    const row = await prisma.paymentSettings.findUnique({ where: { id: "default" } });
    return mergeSettings(row);
  } catch {
    return { ...DEFAULTS, ...envFallbacks() };
  }
}

export function getUsBankDetails(settings: PaymentSettingsData): UsBankDetails | null {
  if (!settings.usBankEnabled) return null;
  if (!settings.usBankName || !settings.usBankAccountNumber || !settings.usBankRoutingNumber) {
    return null;
  }
  return {
    bankName: settings.usBankName,
    accountName: settings.usBankAccountName,
    accountNumber: settings.usBankAccountNumber,
    routingNumber: settings.usBankRoutingNumber,
    accountType: settings.usBankAccountType || "Checking",
  };
}

function hasModelDelegate(client: typeof prisma, model: string) {
  const delegate = (client as unknown as Record<string, unknown>)[model];
  return Boolean(delegate && typeof (delegate as { findUnique?: unknown }).findUnique === "function");
}

export async function getEnabledPaymentMethods(): Promise<PaymentMethod[]> {
  const settings = await getPaymentSettings();
  const methods: PaymentMethod[] = [];
  if (settings.usdtEnabled) methods.push("USDT");
  if (settings.paypalEnabled) methods.push("PAYPAL");
  if (settings.gcashEnabled) methods.push("GCASH");
  if (settings.usBankEnabled) methods.push("US_BANK");
  return methods;
}

export async function assertPaymentMethodEnabled(method: PaymentMethod): Promise<void> {
  const settings = await getPaymentSettings();
  const enabled =
    (method === "USDT" && settings.usdtEnabled) ||
    (method === "PAYPAL" && settings.paypalEnabled) ||
    (method === "GCASH" && settings.gcashEnabled) ||
    (method === "US_BANK" && settings.usBankEnabled);

  if (!enabled) {
    throw new Error(`${method} payments are currently disabled`);
  }
}

export async function updatePaymentSettings(
  input: Partial<PaymentSettingsData>,
): Promise<PaymentSettingsData> {
  if (!hasModelDelegate(prisma, "paymentSettings")) {
    throw new Error("Database not ready. Restart the dev server, then run: npx prisma generate");
  }

  const current = await getPaymentSettings();
  const next: PaymentSettingsData = {
    usdtEnabled: input.usdtEnabled ?? current.usdtEnabled,
    paypalEnabled: input.paypalEnabled ?? current.paypalEnabled,
    gcashEnabled: input.gcashEnabled ?? current.gcashEnabled,
    usBankEnabled: input.usBankEnabled ?? current.usBankEnabled,
    usdtTrc20Wallet: input.usdtTrc20Wallet?.trim() ?? current.usdtTrc20Wallet,
    paypalEmail: input.paypalEmail?.trim() ?? current.paypalEmail,
    gcashNumber: input.gcashNumber?.trim() ?? current.gcashNumber,
    usBankName: input.usBankName?.trim() ?? current.usBankName,
    usBankAccountName: input.usBankAccountName?.trim() ?? current.usBankAccountName,
    usBankAccountNumber: input.usBankAccountNumber?.trim() ?? current.usBankAccountNumber,
    usBankRoutingNumber: input.usBankRoutingNumber?.trim() ?? current.usBankRoutingNumber,
    usBankAccountType: input.usBankAccountType?.trim() ?? current.usBankAccountType,
    usdtInstructions: input.usdtInstructions?.trim() ?? current.usdtInstructions,
    paypalInstructions: input.paypalInstructions?.trim() ?? current.paypalInstructions,
    gcashInstructions: input.gcashInstructions?.trim() ?? current.gcashInstructions,
    usBankInstructions: input.usBankInstructions?.trim() ?? current.usBankInstructions,
    usdtPerUsd:
      input.usdtPerUsd === undefined
        ? current.usdtPerUsd
        : input.usdtPerUsd === null || input.usdtPerUsd <= 0
          ? null
          : input.usdtPerUsd,
  };

  const row = await prisma.paymentSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      usdtEnabled: next.usdtEnabled,
      paypalEnabled: next.paypalEnabled,
      gcashEnabled: next.gcashEnabled,
      usBankEnabled: next.usBankEnabled,
      usdtTrc20Wallet: next.usdtTrc20Wallet || null,
      paypalEmail: next.paypalEmail || null,
      gcashNumber: next.gcashNumber || null,
      usBankName: next.usBankName || null,
      usBankAccountName: next.usBankAccountName || null,
      usBankAccountNumber: next.usBankAccountNumber || null,
      usBankRoutingNumber: next.usBankRoutingNumber || null,
      usBankAccountType: next.usBankAccountType || null,
      usdtInstructions: next.usdtInstructions || null,
      paypalInstructions: next.paypalInstructions || null,
      gcashInstructions: next.gcashInstructions || null,
      usBankInstructions: next.usBankInstructions || null,
      usdtPerUsd: next.usdtPerUsd,
    },
    update: {
      usdtEnabled: next.usdtEnabled,
      paypalEnabled: next.paypalEnabled,
      gcashEnabled: next.gcashEnabled,
      usBankEnabled: next.usBankEnabled,
      usdtTrc20Wallet: next.usdtTrc20Wallet || null,
      paypalEmail: next.paypalEmail || null,
      gcashNumber: next.gcashNumber || null,
      usBankName: next.usBankName || null,
      usBankAccountName: next.usBankAccountName || null,
      usBankAccountNumber: next.usBankAccountNumber || null,
      usBankRoutingNumber: next.usBankRoutingNumber || null,
      usBankAccountType: next.usBankAccountType || null,
      usdtInstructions: next.usdtInstructions || null,
      paypalInstructions: next.paypalInstructions || null,
      gcashInstructions: next.gcashInstructions || null,
      usBankInstructions: next.usBankInstructions || null,
      usdtPerUsd: next.usdtPerUsd,
    },
  });

  return mergeSettings(row);
}

import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { RECOMMENDED_USDT_INSTRUCTIONS } from "@/lib/payment-instructions";

export type PaymentSettingsData = {
  usdtEnabled: boolean;
  paypalEnabled: boolean;
  gcashEnabled: boolean;
  usdtTrc20Wallet: string;
  usdtInstructions: string;
  paypalInstructions: string;
  gcashInstructions: string;
  usdtPerUsd: number | null;
};

const DEFAULTS: PaymentSettingsData = {
  usdtEnabled: true,
  paypalEnabled: true,
  gcashEnabled: true,
  usdtTrc20Wallet: "",
  usdtInstructions: RECOMMENDED_USDT_INSTRUCTIONS,
  paypalInstructions:
    "Complete payment through PayPal and upload your receipt in the support ticket if requested.",
  gcashInstructions:
    "Send payment to the GCash number provided and upload a screenshot as proof if requested.",
  usdtPerUsd: null,
};

function envFallbacks(): Omit<PaymentSettingsData, "usdtEnabled" | "paypalEnabled" | "gcashEnabled"> {
  const usdtPerUsd = Number(process.env.USDT_PER_USD);
  return {
    usdtTrc20Wallet:
      process.env.USDT_TRC20_WALLET?.trim() ||
      process.env.USDT_WALLET_ADDRESS?.trim() ||
      "",
    usdtInstructions:
      process.env.USDT_PAYMENT_INSTRUCTIONS?.trim() || DEFAULTS.usdtInstructions,
    paypalInstructions:
      process.env.PAYPAL_PAYMENT_INSTRUCTIONS?.trim() || DEFAULTS.paypalInstructions,
    gcashInstructions:
      process.env.GCASH_PAYMENT_INSTRUCTIONS?.trim() || DEFAULTS.gcashInstructions,
    usdtPerUsd: usdtPerUsd > 0 ? usdtPerUsd : null,
  };
}

function mergeSettings(
  row: {
    usdtEnabled: boolean;
    paypalEnabled: boolean;
    gcashEnabled: boolean;
    usdtTrc20Wallet: string | null;
    usdtInstructions: string | null;
    paypalInstructions: string | null;
    gcashInstructions: string | null;
    usdtPerUsd: number | null;
  } | null,
): PaymentSettingsData {
  const env = envFallbacks();
  if (!row) return { ...DEFAULTS, ...env };

  return {
    usdtEnabled: row.usdtEnabled,
    paypalEnabled: row.paypalEnabled,
    gcashEnabled: row.gcashEnabled,
    usdtTrc20Wallet: row.usdtTrc20Wallet?.trim() || env.usdtTrc20Wallet,
    usdtInstructions: row.usdtInstructions?.trim() || env.usdtInstructions,
    paypalInstructions: row.paypalInstructions?.trim() || env.paypalInstructions,
    gcashInstructions: row.gcashInstructions?.trim() || env.gcashInstructions,
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
  return methods;
}

export async function assertPaymentMethodEnabled(method: PaymentMethod): Promise<void> {
  const settings = await getPaymentSettings();
  const enabled =
    (method === "USDT" && settings.usdtEnabled) ||
    (method === "PAYPAL" && settings.paypalEnabled) ||
    (method === "GCASH" && settings.gcashEnabled);

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
    usdtTrc20Wallet: input.usdtTrc20Wallet?.trim() ?? current.usdtTrc20Wallet,
    usdtInstructions: input.usdtInstructions?.trim() ?? current.usdtInstructions,
    paypalInstructions: input.paypalInstructions?.trim() ?? current.paypalInstructions,
    gcashInstructions: input.gcashInstructions?.trim() ?? current.gcashInstructions,
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
      usdtTrc20Wallet: next.usdtTrc20Wallet || null,
      usdtInstructions: next.usdtInstructions || null,
      paypalInstructions: next.paypalInstructions || null,
      gcashInstructions: next.gcashInstructions || null,
      usdtPerUsd: next.usdtPerUsd,
    },
    update: {
      usdtEnabled: next.usdtEnabled,
      paypalEnabled: next.paypalEnabled,
      gcashEnabled: next.gcashEnabled,
      usdtTrc20Wallet: next.usdtTrc20Wallet || null,
      usdtInstructions: next.usdtInstructions || null,
      paypalInstructions: next.paypalInstructions || null,
      gcashInstructions: next.gcashInstructions || null,
      usdtPerUsd: next.usdtPerUsd,
    },
  });

  return mergeSettings(row);
}

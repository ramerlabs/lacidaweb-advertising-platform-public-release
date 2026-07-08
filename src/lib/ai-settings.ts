import { prisma } from "@/lib/prisma";
import { getClientPricing, type AiClientPricing } from "@/lib/ai-pricing";

export type AiSettingsData = {
  aiEnabled: boolean;
  hasOpenaiApiKey: boolean;
  openaiApiKeyMasked: string;
  aiProfitMarginPercent: number;
  aiTextInputCostPerMillion: number;
  aiTextOutputCostPerMillion: number;
  aiImageCostUsd: number;
  aiCreditPackUsd: number;
  aiCreditsPerPackCents: number;
  aiTrialTokens: number;
  aiLowTokenThreshold: number;
  clientPricing: AiClientPricing;
};

const DEFAULTS = {
  aiEnabled: false,
  aiProfitMarginPercent: 80,
  aiTextInputCostPerMillion: 0.15,
  aiTextOutputCostPerMillion: 0.6,
  aiImageCostUsd: 0.04,
  aiCreditPackUsd: 10,
  aiCreditsPerPackCents: 1000,
  aiTrialTokens: 50_000,
  aiLowTokenThreshold: 50_000,
};

function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 7)}••••${value.slice(-4)}`;
}

type Row = {
  openaiApiKey: string | null;
  aiEnabled: boolean;
  aiProfitMarginPercent: number;
  aiTextInputCostPerMillion: number;
  aiTextOutputCostPerMillion: number;
  aiImageCostUsd: number;
  aiCreditPackUsd: number;
  aiCreditsPerPackCents: number;
  aiTrialTokens?: number;
  aiLowTokenThreshold?: number;
};

function mergeRow(row: Row | null, openaiApiKey: string): AiSettingsData {
  const key = row?.openaiApiKey?.trim() || openaiApiKey;
  const config = {
    profitMarginPercent: row?.aiProfitMarginPercent ?? DEFAULTS.aiProfitMarginPercent,
    textInputCostPerMillion: row?.aiTextInputCostPerMillion ?? DEFAULTS.aiTextInputCostPerMillion,
    textOutputCostPerMillion: row?.aiTextOutputCostPerMillion ?? DEFAULTS.aiTextOutputCostPerMillion,
    imageCostUsd: row?.aiImageCostUsd ?? DEFAULTS.aiImageCostUsd,
    creditPackUsd: row?.aiCreditPackUsd ?? DEFAULTS.aiCreditPackUsd,
    creditsPerPackCents: row?.aiCreditsPerPackCents ?? DEFAULTS.aiCreditsPerPackCents,
  };

  return {
    aiEnabled: row?.aiEnabled ?? DEFAULTS.aiEnabled,
    hasOpenaiApiKey: Boolean(key),
    openaiApiKeyMasked: maskSecret(key),
    aiProfitMarginPercent: config.profitMarginPercent,
    aiTextInputCostPerMillion: config.textInputCostPerMillion,
    aiTextOutputCostPerMillion: config.textOutputCostPerMillion,
    aiImageCostUsd: config.imageCostUsd,
    aiCreditPackUsd: config.creditPackUsd,
    aiCreditsPerPackCents: config.creditsPerPackCents,
    aiTrialTokens: row?.aiTrialTokens ?? DEFAULTS.aiTrialTokens,
    aiLowTokenThreshold: row?.aiLowTokenThreshold ?? DEFAULTS.aiLowTokenThreshold,
    clientPricing: getClientPricing(config),
  };
}

export async function getAiSettings(): Promise<AiSettingsData> {
  const envKey = process.env.OPENAI_API_KEY?.trim() || "";
  try {
    const row = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
    return mergeRow(row as Row | null, envKey);
  } catch {
    return mergeRow(null, envKey);
  }
}

export async function getOpenAiApiKey(): Promise<string> {
  const settings = await getAiSettings();
  if (!settings.hasOpenaiApiKey) return "";
  const row = await prisma.integrationSettings.findUnique({
    where: { id: "default" },
    select: { openaiApiKey: true },
  });
  return row?.openaiApiKey?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
}

export async function updateAiSettings(input: {
  openaiApiKey?: string;
  aiEnabled?: boolean;
  aiProfitMarginPercent?: number;
  aiTextInputCostPerMillion?: number;
  aiTextOutputCostPerMillion?: number;
  aiImageCostUsd?: number;
  aiCreditPackUsd?: number;
  aiCreditsPerPackCents?: number;
  aiTrialTokens?: number;
  aiLowTokenThreshold?: number;
}): Promise<AiSettingsData> {
  const current = await getAiSettings();
  const currentKeyRow = await prisma.integrationSettings.findUnique({
    where: { id: "default" },
    select: { openaiApiKey: true },
  });
  const currentKey =
    currentKeyRow?.openaiApiKey?.trim() || process.env.OPENAI_API_KEY?.trim() || "";

  const nextKey =
    input.openaiApiKey === undefined
      ? currentKey
      : input.openaiApiKey.trim() || currentKey;

  const next = {
    openaiApiKey: nextKey || null,
    aiEnabled: input.aiEnabled ?? current.aiEnabled,
    aiProfitMarginPercent: input.aiProfitMarginPercent ?? current.aiProfitMarginPercent,
    aiTextInputCostPerMillion: input.aiTextInputCostPerMillion ?? current.aiTextInputCostPerMillion,
    aiTextOutputCostPerMillion:
      input.aiTextOutputCostPerMillion ?? current.aiTextOutputCostPerMillion,
    aiImageCostUsd: input.aiImageCostUsd ?? current.aiImageCostUsd,
    aiCreditPackUsd: input.aiCreditPackUsd ?? current.aiCreditPackUsd,
    aiCreditsPerPackCents:
      input.aiCreditsPerPackCents ??
      (input.aiCreditPackUsd !== undefined
        ? Math.round((input.aiCreditPackUsd ?? current.aiCreditPackUsd) * 100)
        : current.aiCreditsPerPackCents),
    aiTrialTokens: input.aiTrialTokens ?? current.aiTrialTokens,
    aiLowTokenThreshold: input.aiLowTokenThreshold ?? current.aiLowTokenThreshold,
  };

  const row = await prisma.integrationSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...next },
    update: next,
  });

  return mergeRow(row as Row, "");
}

export function toPublicAiSettings(settings: AiSettingsData) {
  return {
    aiEnabled: settings.aiEnabled,
    hasOpenaiApiKey: settings.hasOpenaiApiKey,
    clientPricing: settings.clientPricing,
    packPriceUsd: settings.aiCreditPackUsd,
    tokensPerPack: settings.clientPricing.tokensPerPack,
  };
}

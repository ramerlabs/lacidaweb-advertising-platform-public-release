import { prisma } from "@/lib/prisma";
import { brand } from "@/lib/brand";

export type IntegrationSettingsData = {
  zernioApiKey: string;
  zernioWebhookSecret: string;
  zernioApiKeyMasked: string;
  hasZernioApiKey: boolean;
  hasZernioWebhookSecret: boolean;
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  telegramBotTokenMasked: string;
  hasTelegramBotToken: boolean;
  telegramNotifySupport: boolean;
  telegramNotifyPayments: boolean;
  telegramNotifyPosts: boolean;
  telegramNotifyAccounts: boolean;
  telegramNotifyUsers: boolean;
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  smtpFromEmail: string;
  smtpFromName: string;
  hasSmtpPassword: boolean;
  smtpFallbackTelegram: boolean;
};

function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 7)}••••${value.slice(-4)}`;
}

function envFallbacks() {
  const smtpHost = process.env.SMTP_HOST?.trim() || "";
  return {
    zernioApiKey: process.env.ZERNIO_API_KEY?.trim() || "",
    zernioWebhookSecret: process.env.ZERNIO_WEBHOOK_SECRET?.trim() || "",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
    telegramChatId: process.env.TELEGRAM_CHAT_ID?.trim() || "",
    telegramEnabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    smtpEnabled: Boolean(smtpHost),
    smtpHost,
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpSecure: process.env.SMTP_SECURE === "true",
    smtpUser: process.env.SMTP_USER?.trim() || "",
    smtpPassword: process.env.SMTP_PASSWORD?.trim() || "",
    smtpFromEmail: process.env.SMTP_FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim() || "",
    smtpFromName: process.env.SMTP_FROM_NAME?.trim() || brand.name,
    smtpFallbackTelegram: true,
  };
}

type SettingsRow = {
  zernioApiKey: string | null;
  zernioWebhookSecret: string | null;
  telegramEnabled: boolean;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  telegramNotifySupport: boolean;
  telegramNotifyPayments: boolean;
  telegramNotifyPosts: boolean;
  telegramNotifyAccounts: boolean;
  telegramNotifyUsers: boolean;
  smtpEnabled?: boolean;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFromEmail?: string | null;
  smtpFromName?: string | null;
  smtpFallbackTelegram?: boolean | null;
};

function mergeSettings(row: SettingsRow | null): IntegrationSettingsData {
  const env = envFallbacks();
  const telegramBotToken = row?.telegramBotToken?.trim() || env.telegramBotToken;
  const telegramChatId = row?.telegramChatId?.trim() || env.telegramChatId;
  const zernioApiKey = row?.zernioApiKey?.trim() || env.zernioApiKey;
  const zernioWebhookSecret = row?.zernioWebhookSecret?.trim() || env.zernioWebhookSecret;
  const smtpHost = row?.smtpHost?.trim() || env.smtpHost;
  const smtpPassword = row?.smtpPassword?.trim() || env.smtpPassword;

  return {
    zernioApiKey,
    zernioWebhookSecret,
    zernioApiKeyMasked: maskSecret(zernioApiKey),
    hasZernioApiKey: Boolean(zernioApiKey),
    hasZernioWebhookSecret: Boolean(zernioWebhookSecret),
    telegramEnabled: row?.telegramEnabled ?? env.telegramEnabled,
    telegramBotToken,
    telegramChatId,
    telegramBotTokenMasked: maskSecret(telegramBotToken),
    hasTelegramBotToken: Boolean(telegramBotToken),
    telegramNotifySupport: row?.telegramNotifySupport ?? true,
    telegramNotifyPayments: row?.telegramNotifyPayments ?? true,
    telegramNotifyPosts: row?.telegramNotifyPosts ?? true,
    telegramNotifyAccounts: row?.telegramNotifyAccounts ?? true,
    telegramNotifyUsers: row?.telegramNotifyUsers ?? true,
    smtpEnabled: row?.smtpEnabled ?? env.smtpEnabled,
    smtpHost,
    smtpPort: row?.smtpPort ?? env.smtpPort,
    smtpSecure: row?.smtpSecure ?? env.smtpSecure,
    smtpUser: row?.smtpUser?.trim() || env.smtpUser,
    smtpPassword,
    smtpFromEmail: row?.smtpFromEmail?.trim() || env.smtpFromEmail,
    smtpFromName: row?.smtpFromName?.trim() || env.smtpFromName,
    hasSmtpPassword: Boolean(smtpPassword),
    smtpFallbackTelegram: row?.smtpFallbackTelegram ?? env.smtpFallbackTelegram,
  };
}

function hasModelDelegate(client: typeof prisma, model: string) {
  const delegate = (client as unknown as Record<string, unknown>)[model];
  return Boolean(delegate && typeof (delegate as { findUnique?: unknown }).findUnique === "function");
}

export async function getIntegrationSettings(): Promise<IntegrationSettingsData> {
  if (!hasModelDelegate(prisma, "integrationSettings")) {
    return mergeSettings(null);
  }

  try {
    const row = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
    return mergeSettings(row);
  } catch {
    return mergeSettings(null);
  }
}

export async function getZernioApiKey(): Promise<string> {
  const settings = await getIntegrationSettings();
  return settings.zernioApiKey;
}

export async function getZernioWebhookSecret(): Promise<string> {
  const settings = await getIntegrationSettings();
  return settings.zernioWebhookSecret;
}

export async function updateIntegrationSettings(input: {
  zernioApiKey?: string;
  zernioWebhookSecret?: string;
  telegramEnabled?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramNotifySupport?: boolean;
  telegramNotifyPayments?: boolean;
  telegramNotifyPosts?: boolean;
  telegramNotifyAccounts?: boolean;
  telegramNotifyUsers?: boolean;
  smtpEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  smtpFallbackTelegram?: boolean;
}): Promise<IntegrationSettingsData> {
  if (!hasModelDelegate(prisma, "integrationSettings")) {
    throw new Error("Database not ready. Restart the dev server, then run: npx prisma generate");
  }

  const current = await getIntegrationSettings();
  const next = {
    zernioApiKey:
      input.zernioApiKey === undefined
        ? current.zernioApiKey
        : input.zernioApiKey.trim() || current.zernioApiKey,
    zernioWebhookSecret:
      input.zernioWebhookSecret === undefined
        ? current.zernioWebhookSecret
        : input.zernioWebhookSecret.trim() || current.zernioWebhookSecret,
    telegramEnabled: input.telegramEnabled ?? current.telegramEnabled,
    telegramBotToken:
      input.telegramBotToken === undefined
        ? current.telegramBotToken
        : input.telegramBotToken.trim() || current.telegramBotToken,
    telegramChatId:
      input.telegramChatId === undefined
        ? current.telegramChatId
        : input.telegramChatId.trim() || current.telegramChatId,
    telegramNotifySupport: input.telegramNotifySupport ?? current.telegramNotifySupport,
    telegramNotifyPayments: input.telegramNotifyPayments ?? current.telegramNotifyPayments,
    telegramNotifyPosts: input.telegramNotifyPosts ?? current.telegramNotifyPosts,
    telegramNotifyAccounts: input.telegramNotifyAccounts ?? current.telegramNotifyAccounts,
    telegramNotifyUsers: input.telegramNotifyUsers ?? current.telegramNotifyUsers,
    smtpEnabled: input.smtpEnabled ?? current.smtpEnabled,
    smtpHost: input.smtpHost === undefined ? current.smtpHost : input.smtpHost.trim(),
    smtpPort: input.smtpPort ?? current.smtpPort,
    smtpSecure: input.smtpSecure ?? current.smtpSecure,
    smtpUser: input.smtpUser === undefined ? current.smtpUser : input.smtpUser.trim(),
    smtpPassword:
      input.smtpPassword === undefined
        ? current.smtpPassword
        : input.smtpPassword.trim() || current.smtpPassword,
    smtpFromEmail:
      input.smtpFromEmail === undefined ? current.smtpFromEmail : input.smtpFromEmail.trim(),
    smtpFromName: input.smtpFromName === undefined ? current.smtpFromName : input.smtpFromName.trim(),
    smtpFallbackTelegram: input.smtpFallbackTelegram ?? current.smtpFallbackTelegram,
  };

  const row = await prisma.integrationSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      zernioApiKey: next.zernioApiKey || null,
      zernioWebhookSecret: next.zernioWebhookSecret || null,
      telegramEnabled: next.telegramEnabled,
      telegramBotToken: next.telegramBotToken || null,
      telegramChatId: next.telegramChatId || null,
      telegramNotifySupport: next.telegramNotifySupport,
      telegramNotifyPayments: next.telegramNotifyPayments,
      telegramNotifyPosts: next.telegramNotifyPosts,
      telegramNotifyAccounts: next.telegramNotifyAccounts,
      telegramNotifyUsers: next.telegramNotifyUsers,
      smtpEnabled: next.smtpEnabled,
      smtpHost: next.smtpHost || null,
      smtpPort: next.smtpPort,
      smtpSecure: next.smtpSecure,
      smtpUser: next.smtpUser || null,
      smtpPassword: next.smtpPassword || null,
      smtpFromEmail: next.smtpFromEmail || null,
      smtpFromName: next.smtpFromName || null,
      smtpFallbackTelegram: next.smtpFallbackTelegram,
    },
    update: {
      zernioApiKey: next.zernioApiKey || null,
      zernioWebhookSecret: next.zernioWebhookSecret || null,
      telegramEnabled: next.telegramEnabled,
      telegramBotToken: next.telegramBotToken || null,
      telegramChatId: next.telegramChatId || null,
      telegramNotifySupport: next.telegramNotifySupport,
      telegramNotifyPayments: next.telegramNotifyPayments,
      telegramNotifyPosts: next.telegramNotifyPosts,
      telegramNotifyAccounts: next.telegramNotifyAccounts,
      telegramNotifyUsers: next.telegramNotifyUsers,
      smtpEnabled: next.smtpEnabled,
      smtpHost: next.smtpHost || null,
      smtpPort: next.smtpPort,
      smtpSecure: next.smtpSecure,
      smtpUser: next.smtpUser || null,
      smtpPassword: next.smtpPassword || null,
      smtpFromEmail: next.smtpFromEmail || null,
      smtpFromName: next.smtpFromName || null,
      smtpFallbackTelegram: next.smtpFallbackTelegram,
    },
  });

  return mergeSettings(row);
}

export function toPublicIntegrationSettings(settings: IntegrationSettingsData) {
  return {
    zernioApiKeyMasked: settings.zernioApiKeyMasked,
    hasZernioApiKey: settings.hasZernioApiKey,
    hasZernioWebhookSecret: settings.hasZernioWebhookSecret,
    telegramEnabled: settings.telegramEnabled,
    telegramChatId: settings.telegramChatId,
    telegramBotTokenMasked: settings.telegramBotTokenMasked,
    hasTelegramBotToken: settings.hasTelegramBotToken,
    telegramNotifySupport: settings.telegramNotifySupport,
    telegramNotifyPayments: settings.telegramNotifyPayments,
    telegramNotifyPosts: settings.telegramNotifyPosts,
    telegramNotifyAccounts: settings.telegramNotifyAccounts,
    telegramNotifyUsers: settings.telegramNotifyUsers,
    smtpEnabled: settings.smtpEnabled,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser,
    smtpFromEmail: settings.smtpFromEmail,
    smtpFromName: settings.smtpFromName,
    hasSmtpPassword: settings.hasSmtpPassword,
    smtpFallbackTelegram: settings.smtpFallbackTelegram,
  };
}

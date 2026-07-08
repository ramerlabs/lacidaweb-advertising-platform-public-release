import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { getIntegrationSettings } from "@/lib/integration-settings";
import { getSiteSettings } from "@/lib/site-settings";
import { sendTelegramMessage } from "@/services/telegram";
import { brand } from "@/lib/brand";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult = {
  ok: boolean;
  method: "smtp" | "telegram-fallback" | "log-fallback";
  error?: string;
};

function envSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER?.trim() || "",
    password: process.env.SMTP_PASSWORD?.trim() || "",
    fromEmail: process.env.SMTP_FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim() || "",
    fromName: process.env.SMTP_FROM_NAME?.trim() || brand.name,
    enabled: true,
    fallbackTelegram: true,
  };
}

async function resolveSmtpConfig() {
  const settings = await getIntegrationSettings();
  const env = envSmtpConfig();

  const host = settings.smtpHost || env?.host || "";
  if (!settings.smtpEnabled && !env?.enabled) return null;
  if (!host) return null;

  return {
    host,
    port: settings.smtpPort || env?.port || 587,
    secure: settings.smtpSecure ?? env?.secure ?? false,
    user: settings.smtpUser || env?.user || "",
    password: settings.smtpPassword || env?.password || "",
    fromEmail: settings.smtpFromEmail || env?.fromEmail || settings.smtpUser || env?.user || "",
    fromName: settings.smtpFromName || env?.fromName || brand.name,
    fallbackTelegram: settings.smtpFallbackTelegram ?? env?.fallbackTelegram ?? true,
    telegramBotToken: settings.telegramBotToken,
    telegramChatId: settings.telegramChatId,
    telegramEnabled: settings.telegramEnabled,
  };
}

async function sendViaSmtp(
  config: NonNullable<Awaited<ReturnType<typeof resolveSmtpConfig>>>,
  input: SendEmailInput,
) {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.password } : undefined,
  } as SMTPTransport.Options);

  await transport.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html || input.text.replace(/\n/g, "<br>"),
  });
}

async function sendTelegramFallback(
  config: NonNullable<Awaited<ReturnType<typeof resolveSmtpConfig>>>,
  input: SendEmailInput,
  smtpError: string,
) {
  if (!config.fallbackTelegram || !config.telegramEnabled) return false;
  if (!config.telegramBotToken || !config.telegramChatId) return false;

  const text = [
    "📧 SMTP failed — email fallback",
    "",
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    `SMTP error: ${smtpError}`,
    "",
    input.text,
  ].join("\n");

  await sendTelegramMessage({
    botToken: config.telegramBotToken,
    chatId: config.telegramChatId,
    text,
  });
  return true;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = await resolveSmtpConfig();

  if (!config) {
    console.warn("[email] SMTP not configured", { to: input.to, subject: input.subject });
    return { ok: false, method: "log-fallback", error: "SMTP not configured" };
  }

  try {
    await sendViaSmtp(config, input);
    return { ok: true, method: "smtp" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP send failed";
    console.error("[email] SMTP failed:", message, { to: input.to, subject: input.subject });

    try {
      const telegramSent = await sendTelegramFallback(config, input, message);
      if (telegramSent) {
        return { ok: true, method: "telegram-fallback", error: message };
      }
    } catch (fallbackError) {
      console.error("[email] Telegram fallback failed:", fallbackError);
    }

    console.warn("[email] Log fallback", input);
    return { ok: false, method: "log-fallback", error: message };
  }
}

export async function sendTestEmail(to: string) {
  const site = await getSiteSettings();
  return sendEmail({
    to,
    subject: `${site.title} — SMTP test`,
    text: `This is a test email from ${site.title} (${site.url}).\n\nIf you received this, SMTP is working correctly.`,
    html: `<p>This is a test email from <strong>${site.title}</strong> (<a href="${site.url}">${site.url}</a>).</p><p>If you received this, SMTP is working correctly.</p>`,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name?: string | null;
  newPassword: string;
  resetByAdmin?: boolean;
}) {
  const site = await getSiteSettings();
  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  const intro = input.resetByAdmin
    ? "An administrator reset your account password."
    : "Your password was reset.";

  const text = [
    greeting,
    "",
    intro,
    "",
    `New temporary password: ${input.newPassword}`,
    "",
    `Sign in: ${site.url}/login`,
    "",
    "Please change your password after signing in.",
    "",
    `— ${site.title}`,
  ].join("\n");

  return sendEmail({
    to: input.to,
    subject: `${site.title} — Password reset`,
    text,
    html: `<p>${greeting}</p><p>${intro}</p><p><strong>New temporary password:</strong> <code>${input.newPassword}</code></p><p><a href="${site.url}/login">Sign in</a></p><p>Please change your password after signing in.</p><p>— ${site.title}</p>`,
  });
}

export async function sendPasswordChangedEmail(input: { to: string; name?: string | null }) {
  const site = await getSiteSettings();
  const greeting = input.name ? `Hi ${input.name},` : "Hi,";

  const text = [
    greeting,
    "",
    "Your password was changed successfully.",
    "",
    `If you did not make this change, contact ${site.supportEmail} immediately.`,
    "",
    `— ${site.title}`,
  ].join("\n");

  return sendEmail({
    to: input.to,
    subject: `${site.title} — Password changed`,
    text,
    html: `<p>${greeting}</p><p>Your password was changed successfully.</p><p>If you did not make this change, contact <a href="mailto:${site.supportEmail}">${site.supportEmail}</a> immediately.</p><p>— ${site.title}</p>`,
  });
}

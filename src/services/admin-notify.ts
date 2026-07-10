import { prisma } from "@/lib/prisma";
import { getIntegrationSettings } from "@/lib/integration-settings";
import { getSiteSettings } from "@/lib/site-settings";
import { sendTelegramMessage } from "@/services/telegram";
import { brand } from "@/lib/brand";

type NotifyCategory = "support" | "payments" | "users";

async function brandLabel(): Promise<string> {
  try {
    const site = await getSiteSettings();
    return site.title?.trim() || String(brand.name);
  } catch {
    return String(brand.name);
  }
}

async function shouldNotify(category: NotifyCategory): Promise<boolean> {
  const settings = await getIntegrationSettings();
  if (!settings.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
    return false;
  }
  if (category === "support") return settings.telegramNotifySupport;
  if (category === "payments") return settings.telegramNotifyPayments;
  return settings.telegramNotifyUsers;
}

async function dispatch(category: NotifyCategory, lines: string[]) {
  try {
    if (!(await shouldNotify(category))) return;
    const settings = await getIntegrationSettings();
    if (!settings.telegramBotToken || !settings.telegramChatId) return;

    const name = await brandLabel();
    const text = [`🔔 ${name} activity`, "", ...lines].join("\n");
    await sendTelegramMessage({
      botToken: settings.telegramBotToken,
      chatId: settings.telegramChatId,
      text,
    });
  } catch (error) {
    console.error("[telegram-notify]", error);
  }
}

async function teamLabel(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
  return team?.name || teamId;
}

async function userLabel(userId?: string | null) {
  if (!userId) return "Unknown user";
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  return user ? `${user.name || user.email} (${user.email})` : userId;
}

export function notifyAdminSupportTicket(input: {
  teamId: string;
  userId: string;
  subject: string;
  priority: string;
  ticketId: string;
}) {
  void (async () => {
    const team = await teamLabel(input.teamId);
    const user = await userLabel(input.userId);
    await dispatch("support", [
      "Type: New support ticket",
      `Team: ${team}`,
      `User: ${user}`,
      `Priority: ${input.priority}`,
      `Subject: ${input.subject}`,
      `Ticket: ${input.ticketId}`,
    ]);
  })();
}

export function notifyAdminSupportReply(input: {
  teamId: string;
  userId: string;
  subject: string;
  message: string;
  ticketId: string;
}) {
  void (async () => {
    const team = await teamLabel(input.teamId);
    const user = await userLabel(input.userId);
    await dispatch("support", [
      "Type: Client support reply",
      `Team: ${team}`,
      `User: ${user}`,
      `Subject: ${input.subject}`,
      `Message: ${input.message.slice(0, 500)}`,
      `Ticket: ${input.ticketId}`,
    ]);
  })();
}

export function notifyAdminPaymentCreated(input: {
  teamId: string;
  method: string;
  amount: number;
  planId?: string;
  paymentId: string;
}) {
  void (async () => {
    const team = await teamLabel(input.teamId);
    await dispatch("payments", [
      "Type: Payment started",
      `Team: ${team}`,
      `Method: ${input.method}`,
      `Amount: $${input.amount}`,
      input.planId ? `Plan: ${input.planId}` : "",
      `Payment: ${input.paymentId}`,
    ].filter(Boolean));
  })();
}

export function notifyAdminPaymentCompleted(input: {
  teamId: string;
  method: string;
  amount: number;
  paymentId: string;
  txHash?: string | null;
}) {
  void (async () => {
    const team = await teamLabel(input.teamId);
    await dispatch("payments", [
      "Type: Payment completed ✅",
      `Team: ${team}`,
      `Method: ${input.method}`,
      `Amount: $${input.amount}`,
      input.txHash ? `TX: ${input.txHash}` : "",
      `Payment: ${input.paymentId}`,
    ].filter(Boolean));
  })();
}

export function notifyAdminUserRegistered(input: {
  name: string;
  email: string;
  teamName: string;
  teamId?: string;
}) {
  void (async () => {
    await dispatch("users", [
      "Type: New user registered",
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Team: ${input.teamName}`,
      input.teamId ? `Team ID: ${input.teamId}` : "",
    ].filter(Boolean));
  })();
}

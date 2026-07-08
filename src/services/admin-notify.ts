import { prisma } from "@/lib/prisma";
import { getIntegrationSettings } from "@/lib/integration-settings";
import { sendTelegramMessage } from "@/services/telegram";
import { brand } from "@/lib/brand";

type NotifyCategory = "support" | "payments" | "posts" | "accounts" | "users";

async function shouldNotify(category: NotifyCategory): Promise<boolean> {
  const settings = await getIntegrationSettings();
  if (!settings.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
    return false;
  }
  if (category === "support") return settings.telegramNotifySupport;
  if (category === "payments") return settings.telegramNotifyPayments;
  if (category === "posts") return settings.telegramNotifyPosts;
  if (category === "accounts") return settings.telegramNotifyAccounts;
  return settings.telegramNotifyUsers;
}

async function dispatch(category: NotifyCategory, lines: string[]) {
  try {
    if (!(await shouldNotify(category))) return;
    const settings = await getIntegrationSettings();
    if (!settings.telegramBotToken || !settings.telegramChatId) return;

    const text = [`🔔 ${brand.name} activity`, "", ...lines].join("\n");
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

export function notifyAdminPostActivity(input: {
  teamId: string;
  userId?: string;
  action: "published" | "scheduled" | "draft" | "failed";
  content: string;
  postId: string;
  platforms?: string[];
  scheduledFor?: Date | null;
}) {
  void (async () => {
    const team = await teamLabel(input.teamId);
    const user = await userLabel(input.userId);
    const actionLabel =
      input.action === "published"
        ? "Post published 🚀"
        : input.action === "scheduled"
          ? "Post scheduled 📅"
          : input.action === "failed"
            ? "Post failed ❌"
            : "Post saved as draft";

    await dispatch("posts", [
      `Type: ${actionLabel}`,
      `Team: ${team}`,
      `User: ${user}`,
      input.platforms?.length ? `Platforms: ${input.platforms.join(", ")}` : "",
      input.scheduledFor ? `Scheduled: ${input.scheduledFor.toISOString()}` : "",
      `Preview: ${input.content.slice(0, 200) || "(media only)"}`,
      `Post: ${input.postId}`,
    ].filter(Boolean));
  })();
}

export function notifyAdminAccountConnected(input: {
  teamId: string;
  platform?: string | null;
}) {
  void (async () => {
    const team = await teamLabel(input.teamId);
    await dispatch("accounts", [
      "Type: Social account connected",
      `Team: ${team}`,
      `Platform: ${input.platform || "unknown"}`,
    ]);
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

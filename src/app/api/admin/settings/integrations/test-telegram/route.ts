import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { getIntegrationSettings } from "@/lib/integration-settings";
import { sendTelegramTest } from "@/services/telegram";

const schema = z.object({
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const body = schema.parse(await req.json().catch(() => ({})));
    const settings = await getIntegrationSettings();

    const botToken = body.telegramBotToken?.trim() || settings.telegramBotToken;
    const chatId = body.telegramChatId?.trim() || settings.telegramChatId;

    if (!botToken || !chatId) {
      return NextResponse.json({ error: "Telegram bot token and chat ID required" }, { status: 400 });
    }

    await sendTelegramTest(botToken, chatId);
    return NextResponse.json({ ok: true, message: "Test message sent to Telegram" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram test failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

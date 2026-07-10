import { getSiteSettings } from "@/lib/site-settings";
import { brand } from "@/lib/brand";

const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(input: {
  botToken: string;
  chatId: string;
  text: string;
}): Promise<void> {
  const url = `${TELEGRAM_API}/bot${input.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: input.text.slice(0, 4000),
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error: ${body}`);
  }
}

export async function sendTelegramTest(botToken: string, chatId: string) {
  let name: string = brand.name;
  try {
    const site = await getSiteSettings();
    name = site.title?.trim() || brand.name;
  } catch {
    // keep default
  }

  await sendTelegramMessage({
    botToken,
    chatId,
    text: `✅ ${name} admin notifications are connected. You will receive alerts for platform activity here.`,
  });
}

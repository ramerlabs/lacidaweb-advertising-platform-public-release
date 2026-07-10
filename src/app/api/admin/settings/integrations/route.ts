import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import {
  getIntegrationSettings,
  toPublicIntegrationSettings,
  updateIntegrationSettings,
} from "@/lib/integration-settings";

const schema = z.object({
  telegramEnabled: z.boolean().optional(),
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
  telegramNotifySupport: z.boolean().optional(),
  telegramNotifyPayments: z.boolean().optional(),
  telegramNotifyUsers: z.boolean().optional(),
  smtpEnabled: z.boolean().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromEmail: z.string().email().or(z.literal("")).optional(),
  smtpFromName: z.string().optional(),
  smtpFallbackTelegram: z.boolean().optional(),
  googleOAuthEnabled: z.boolean().optional(),
  facebookOAuthEnabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const settings = await getIntegrationSettings();
    return NextResponse.json({ settings: toPublicIntegrationSettings(settings) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const body = schema.parse(await req.json());
    const settings = await updateIntegrationSettings(body);
    return NextResponse.json({ settings: toPublicIntegrationSettings(settings) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

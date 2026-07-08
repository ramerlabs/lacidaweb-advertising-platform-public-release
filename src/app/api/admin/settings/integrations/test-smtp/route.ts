import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { getIntegrationSettings } from "@/lib/integration-settings";
import { sendTestEmail } from "@/services/email";

const schema = z.object({
  to: z.string().email().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromEmail: z.string().optional(),
  smtpFromName: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const body = schema.parse(await req.json().catch(() => ({})));
    const settings = await getIntegrationSettings();

    const to = body.to?.trim() || session.user.email;
    if (!to) {
      return NextResponse.json({ error: "Recipient email required" }, { status: 400 });
    }

    const result = await sendTestEmail(to);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error || "SMTP test failed",
          method: result.method,
          hint: settings.smtpFallbackTelegram
            ? "If Telegram fallback is enabled, check your Telegram for the message."
            : "Enable Telegram fallback in Integrations to receive emails when SMTP fails.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        result.method === "telegram-fallback"
          ? "SMTP failed but the message was delivered via Telegram fallback."
          : "Test email sent successfully",
      method: result.method,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP test failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

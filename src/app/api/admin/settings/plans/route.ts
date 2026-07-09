import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { buildPlans } from "@/lib/pricing";
import { getSubscriptionSettings, updateSubscriptionSettings } from "@/lib/subscription-settings";

const schema = z.object({
  subscriptionProfitMarginPercent: z.number().min(0).max(99).optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const settings = await getSubscriptionSettings();
    const plans = buildPlans(settings.subscriptionProfitMarginPercent);
    return NextResponse.json({ settings, plans });
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
    const settings = await updateSubscriptionSettings(body);
    const plans = buildPlans(settings.subscriptionProfitMarginPercent);
    return NextResponse.json({ settings, plans });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

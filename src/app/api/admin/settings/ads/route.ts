import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { getAdsSettings, updateAdsSettings } from "@/lib/ads-settings";
import { formatAdPricing } from "@/lib/ads-pricing";

const schema = z.object({
  adsEnabled: z.boolean().optional(),
  adsProfitMarginPercent: z.number().int().min(0).max(99).optional(),
  adWalletTopUpUsd: z.number().min(5).max(10000).optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const settings = await getAdsSettings();
    const samplePricing = formatAdPricing(10, settings.adsProfitMarginPercent);
    return NextResponse.json({ settings, samplePricing });
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
    const settings = await updateAdsSettings(body);
    const samplePricing = formatAdPricing(10, settings.adsProfitMarginPercent);
    return NextResponse.json({ settings, samplePricing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getAdsSettings } from "@/lib/ads-settings";
import { formatAdPricing } from "@/lib/ads-pricing";

export async function GET(req: Request) {
  try {
    await requireSession();
    const amount = Number(new URL(req.url).searchParams.get("budget") || "5");
    const settings = await getAdsSettings();
    const pricing = formatAdPricing(amount, settings.adsProfitMarginPercent);
    return NextResponse.json({ settings, pricing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

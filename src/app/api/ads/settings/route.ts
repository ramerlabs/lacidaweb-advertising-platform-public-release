import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getAdsSettings } from "@/lib/ads-settings";

export async function GET() {
  try {
    await requireSession();
    const settings = await getAdsSettings();
    return NextResponse.json({ adsEnabled: settings.adsEnabled });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

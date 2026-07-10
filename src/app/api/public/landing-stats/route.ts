import { NextResponse } from "next/server";
import { getLandingAdStatsDisplay } from "@/lib/ads-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getLandingAdStatsDisplay();
  return NextResponse.json({
    impressions: stats.impressions,
    clicks: stats.clicks,
    fakeEnabled: stats.fakeEnabled,
    impressionsPerHour: stats.impressionsPerHour,
    clicksPerHour: stats.clicksPerHour,
    serverTime: new Date().toISOString(),
  });
}

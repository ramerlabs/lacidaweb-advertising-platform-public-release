import { NextResponse } from "next/server";
import { getAdsSettings } from "@/lib/ads-settings";
import { getAutoAdsConfig } from "@/lib/publisher-auto-ads";
import { isPlatformLicensed } from "@/lib/license";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    if (!(await isPlatformLicensed())) {
      return NextResponse.json({ enabled: false, slots: [] }, { headers: corsHeaders });
    }

    const siteKey = new URL(req.url).searchParams.get("site");
    if (!siteKey) {
      return NextResponse.json({ error: "site required" }, { status: 400, headers: corsHeaders });
    }

    const platform = await getAdsSettings();
    if (!platform.adsEnabled || !platform.publisherAutoAdsEnabled) {
      return NextResponse.json({ enabled: false, slots: [] }, { headers: corsHeaders });
    }

    const config = await getAutoAdsConfig(siteKey);
    if (!config || !config.autoAdsEnabled) {
      return NextResponse.json({ enabled: false, slots: [] }, { headers: corsHeaders });
    }

    return NextResponse.json(
      {
        enabled: true,
        domain: config.domain,
        rotationSeconds: platform.publisherAdRotateSeconds,
        slots: config.slots,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}

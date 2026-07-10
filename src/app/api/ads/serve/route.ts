import { NextResponse } from "next/server";
import { serveAdsForPlacement } from "@/services/ad-serving";
import { clientIpFromRequest } from "@/services/publisher-earnings";
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
      return NextResponse.json({ ad: null, ads: [] }, { headers: corsHeaders });
    }
    const url = new URL(req.url);
    const placement = url.searchParams.get("placement");
    if (!placement) {
      return NextResponse.json({ error: "placement required" }, { status: 400, headers: corsHeaders });
    }

    const origin = url.origin;
    const visitorId = url.searchParams.get("visitor") || undefined;

    const result = await serveAdsForPlacement(placement, {
      visitorId,
      origin,
      meta: {
        visitorId,
        ip: clientIpFromRequest(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
    if (!result || !result.ads.length) {
      return NextResponse.json({ ad: null, ads: [] }, { headers: corsHeaders });
    }

    return NextResponse.json(
      {
        ad: result.ads[0],
        ads: result.ads,
        rotationSeconds: result.rotationSeconds,
        servingMode: result.servingMode,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}

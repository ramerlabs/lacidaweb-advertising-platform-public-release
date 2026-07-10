import { NextResponse } from "next/server";
import { recordAdClick } from "@/services/ad-serving";
import { clientIpFromRequest } from "@/services/publisher-earnings";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const adId = url.searchParams.get("adId");
    const placement = url.searchParams.get("placement");
    const visitorId = url.searchParams.get("visitor");

    if (!adId || !placement) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const destination = await recordAdClick(adId, placement, {
      visitorId,
      ip: clientIpFromRequest(req),
      userAgent: req.headers.get("user-agent"),
    });
    if (!destination) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.redirect(destination);
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

import { NextResponse } from "next/server";
import { recordAdClick } from "@/services/ad-serving";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const adId = url.searchParams.get("adId");
    const placement = url.searchParams.get("placement");

    if (!adId || !placement) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const destination = await recordAdClick(adId, placement);
    if (!destination) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.redirect(destination);
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings";

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({
      settings: {
        title: settings.title,
        product: settings.product,
        description: settings.description,
        logoUrl: settings.logoUrl,
        logoDarkUrl: settings.logoDarkUrl,
        logoHeightPx: settings.logoHeightPx,
        faviconUrl: settings.faviconUrl,
        domain: settings.domain,
        tagline: settings.tagline,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { getAdsSettings, updateAdsSettings } from "@/lib/ads-settings";

const schema = z.object({
  adsEnabled: z.boolean().optional(),
  publisherAdServingMode: z.enum(["ROTATE_ALL", "PERSONALIZED"]).optional(),
  publisherAdRotateSeconds: z.number().int().min(0).max(120).optional(),
  publisherAutoAdsEnabled: z.boolean().optional(),
  publisherCpmCents: z.number().int().min(0).max(100_000).optional(),
  publisherCpcCents: z.number().int().min(0).max(10_000).optional(),
  publisherMinPayoutCents: z.number().int().min(100).max(1_000_000).optional(),
  landingFakeStatsEnabled: z.boolean().optional(),
  landingFakeImpressionsBase: z.number().int().min(0).max(100_000_000).optional(),
  landingFakeClicksBase: z.number().int().min(0).max(10_000_000).optional(),
  landingFakeImpressionsPerHour: z.number().min(0).max(100_000).optional(),
  landingFakeClicksPerHour: z.number().min(0).max(10_000).optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const settings = await getAdsSettings();
    return NextResponse.json({ settings });
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
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

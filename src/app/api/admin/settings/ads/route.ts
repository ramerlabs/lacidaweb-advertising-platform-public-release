import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { getAdsSettings, updateAdsSettings } from "@/lib/ads-settings";
import { PERSONAL_AUTO_ADS_KEY } from "@/lib/domain-approval";
import { buildAutoEmbedSnippet, ensurePersonalAutoAdsSite } from "@/lib/publisher-auto-ads";
import { getAppOrigin } from "@/lib/publisher-embed";

const schema = z.object({
  adsEnabled: z.boolean().optional(),
  adsProfitMarginPercent: z.number().int().min(0).max(99).optional(),
  publisherAdServingMode: z.enum(["ROTATE_ALL", "PERSONALIZED"]).optional(),
  publisherAdRotateSeconds: z.number().int().min(0).max(120).optional(),
  publisherAutoAdsEnabled: z.boolean().optional(),
  requireDomainApproval: z.boolean().optional(),
  allowedAdDomains: z.string().max(4000).optional(),
  publisherCpmCents: z.number().int().min(0).max(100_000).optional(),
  publisherCpcCents: z.number().int().min(0).max(10_000).optional(),
  publisherMinPayoutCents: z.number().int().min(100).max(1_000_000).optional(),
  landingFakeStatsEnabled: z.boolean().optional(),
  landingFakeImpressionsBase: z.number().int().min(0).max(100_000_000).optional(),
  landingFakeClicksBase: z.number().int().min(0).max(10_000_000).optional(),
  landingFakeImpressionsPerHour: z.number().min(0).max(100_000).optional(),
  landingFakeClicksPerHour: z.number().min(0).max(10_000).optional(),
  houseAdHeadline: z.string().max(120).optional(),
  houseAdBody: z.string().max(500).optional(),
  houseAdCtaLabel: z.string().max(40).optional(),
  houseAdUrl: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const settings = await getAdsSettings();
    await ensurePersonalAutoAdsSite().catch(() => null);
    return NextResponse.json({
      settings,
      personalAutoAdsKey: PERSONAL_AUTO_ADS_KEY,
      personalEmbedSnippet: buildAutoEmbedSnippet(PERSONAL_AUTO_ADS_KEY, getAppOrigin()),
    });
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
    await ensurePersonalAutoAdsSite().catch(() => null);
    return NextResponse.json({
      settings,
      personalAutoAdsKey: PERSONAL_AUTO_ADS_KEY,
      personalEmbedSnippet: buildAutoEmbedSnippet(PERSONAL_AUTO_ADS_KEY, getAppOrigin()),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

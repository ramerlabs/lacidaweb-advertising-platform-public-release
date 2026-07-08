import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings";

const schema = z.object({
  title: z.string().min(1).max(120).optional(),
  product: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  logoUrl: z.string().url().or(z.literal("")).optional(),
  faviconUrl: z.string().url().or(z.literal("")).optional(),
  activityFeedDisplayCount: z.number().int().min(20).max(100).optional(),
  activityFeedSimulatedEnabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const settings = await getSiteSettings();
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
    const settings = await updateSiteSettings(body);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdTemplate } from "@/lib/publisher-ad-templates";
import { ensureAutoPlacements, ensureSiteAutoAdsKey } from "@/lib/publisher-auto-ads";

const templateIds = [
  "banner",
  "leaderboard",
  "rectangle",
  "skyscraper",
  "mobile",
  "text-inline",
  "text-box",
  "text-article",
] as const;

const createSiteSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1).max(120),
  domain: z
    .string()
    .min(3)
    .max(200)
    .transform((v) => v.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase()),
  preset: z.enum(templateIds).default("banner"),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const sites = await prisma.publisherSite.findMany({
      where: { teamId },
      include: {
        placements: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    await Promise.all(sites.map((site) => ensureAutoPlacements(site.id)));
    await Promise.all(sites.map((site) => ensureSiteAutoAdsKey(site.id)));

    const refreshed = await prisma.publisherSite.findMany({
      where: { teamId },
      include: {
        placements: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sites: refreshed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = createSiteSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id);

    const template = getAdTemplate(body.preset) || getAdTemplate("banner")!;

    const site = await prisma.publisherSite.create({
      data: {
        teamId: body.teamId,
        name: body.name.trim(),
        domain: body.domain,
        status: "ACTIVE",
        placements: {
          create: {
            name: `${template.name} — homepage`,
            format: template.format as "BANNER",
            width: template.width,
            height: template.height,
          },
        },
      },
      include: { placements: true },
    });

    await ensureAutoPlacements(site.id);
    await ensureSiteAutoAdsKey(site.id);

    const full = await prisma.publisherSite.findUnique({
      where: { id: site.id },
      include: { placements: true },
    });

    return NextResponse.json({ site: full });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

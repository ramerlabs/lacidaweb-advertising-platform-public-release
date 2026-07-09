import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdTemplate } from "@/lib/publisher-ad-templates";

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

const createPlacementSchema = z.object({
  teamId: z.string().min(1),
  siteId: z.string().min(1),
  templateId: z.enum(templateIds).optional(),
  preset: z.enum(templateIds).optional(),
  name: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = createPlacementSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id);

    const site = await prisma.publisherSite.findFirst({
      where: { id: body.siteId, teamId: body.teamId },
    });
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const templateKey = body.templateId || body.preset || "banner";
    const template = getAdTemplate(templateKey);
    if (!template) {
      return NextResponse.json({ error: "Unknown ad template" }, { status: 400 });
    }

    const placement = await prisma.adPlacement.create({
      data: {
        siteId: site.id,
        name: body.name.trim(),
        format: template.format as "BANNER",
        width: template.width,
        height: template.height,
      },
    });

    return NextResponse.json({ placement, template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

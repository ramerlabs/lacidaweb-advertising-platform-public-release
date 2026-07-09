import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureAutoPlacements } from "@/lib/publisher-auto-ads";

const patchSchema = z.object({
  teamId: z.string().min(1),
  autoAdsEnabled: z.boolean(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const session = await requireSession();
    const { siteId } = await params;
    const body = patchSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id);

    const site = await prisma.publisherSite.findFirst({
      where: { id: siteId, teamId: body.teamId },
    });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const updated = await prisma.publisherSite.update({
      where: { id: siteId },
      data: { autoAdsEnabled: body.autoAdsEnabled },
    });

    if (body.autoAdsEnabled) {
      await ensureAutoPlacements(siteId);
    }

    return NextResponse.json({ site: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

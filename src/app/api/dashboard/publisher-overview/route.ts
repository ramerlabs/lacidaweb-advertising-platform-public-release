import { NextResponse } from "next/server";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const [sites, placementsAgg] = await Promise.all([
      prisma.publisherSite.count({ where: { teamId } }),
      prisma.adPlacement.aggregate({
        _sum: { impressions: true, clicks: true },
        _count: true,
        where: { site: { teamId } },
      }),
    ]);

    const recentPlacements = await prisma.adPlacement.findMany({
      where: { site: { teamId } },
      include: { site: { select: { name: true, domain: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    const impressions = placementsAgg._sum.impressions ?? 0;
    const clicks = placementsAgg._sum.clicks ?? 0;
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0.00";

    return NextResponse.json({
      sites,
      placements: placementsAgg._count,
      impressions,
      clicks,
      ctr,
      recentPlacements,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

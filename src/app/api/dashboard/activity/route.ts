import { NextResponse } from "next/server";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { buildActivityFeed } from "@/lib/activity-feed";
import { getDisplaySettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const [posts, display] = await Promise.all([
      prisma.post.findMany({
        where: { teamId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, content: true, status: true, createdAt: true },
      }),
      getDisplaySettings(),
    ]);

    const items = buildActivityFeed({
      realPosts: posts,
      displayCount: display.activityFeedDisplayCount,
      simulatedEnabled: display.activityFeedSimulatedEnabled,
      seedKey: teamId,
    });

    return NextResponse.json({
      items,
      meta: {
        realCount: posts.length,
        displayCount: display.activityFeedDisplayCount,
        simulatedEnabled: display.activityFeedSimulatedEnabled,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

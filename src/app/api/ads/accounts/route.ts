import { NextResponse } from "next/server";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { listPlatformAdAccounts, listTeamAdsAccounts } from "@/services/ads";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    const zernioAccountId = new URL(req.url).searchParams.get("zernioAccountId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

    await requireTeamAccess(teamId, session.user.id);

    const connections = await listTeamAdsAccounts(teamId);

    if (zernioAccountId) {
      const owned = connections.find((c) => c.zernioAccountId === zernioAccountId);
      if (!owned) return NextResponse.json({ error: "Ads connection not found" }, { status: 404 });
      const adAccounts = await listPlatformAdAccounts(zernioAccountId);
      return NextResponse.json({ adAccounts });
    }

    return NextResponse.json({
      connections: connections.map((c) => ({
        id: c.id,
        platform: c.platform,
        zernioAccountId: c.zernioAccountId,
        username: c.username,
        displayName: c.displayName,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

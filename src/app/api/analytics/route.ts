import { NextResponse } from "next/server";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { getTeamAnalytics } from "@/services/analytics";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const analytics = await getTeamAnalytics(teamId);
    return NextResponse.json(analytics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analytics failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

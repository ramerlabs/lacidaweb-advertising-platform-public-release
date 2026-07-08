import { NextResponse } from "next/server";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

    await requireTeamAccess(teamId, session.user.id);

    const logs = await prisma.aiUsageLog.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ usage: logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

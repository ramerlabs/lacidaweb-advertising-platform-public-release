import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { startAccountConnect, syncConnectedAccounts, disconnectAccount } from "@/services/accounts";
import { PLATFORMS } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const connectSchema = z.object({
  teamId: z.string().min(1),
  platform: z.enum(PLATFORMS.map((p) => p.id) as [string, ...string[]]),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    await requireTeamAccess(teamId, session.user.id);
    const sync = searchParams.get("sync") === "1";
    if (sync) {
      await syncConnectedAccounts(teamId);
    }

    const accounts = await prisma.connectedAccount.findMany({
      where: { teamId, isActive: true },
      orderBy: { connectedAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = connectSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN", "MEMBER"]);

    const result = await startAccountConnect({
      teamId: body.teamId,
      platform: body.platform as (typeof PLATFORMS)[number]["id"],
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connect failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const accountId = searchParams.get("accountId");
    if (!teamId || !accountId) {
      return NextResponse.json({ error: "teamId and accountId required" }, { status: 400 });
    }

    await requireTeamAccess(teamId, session.user.id, ["OWNER", "ADMIN"]);
    await disconnectAccount(teamId, accountId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disconnect failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

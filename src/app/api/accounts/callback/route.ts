import { NextResponse } from "next/server";
import { syncConnectedAccounts } from "@/services/accounts";
import { prisma } from "@/lib/prisma";
import { notifyAdminAccountConnected } from "@/services/admin-notify";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");
    const platform = searchParams.get("platform");

    // After OAuth, Zernio redirects here. Sync accounts for matching profile/team.
    let team = profileId
      ? await prisma.team.findFirst({ where: { zernioProfileId: profileId } })
      : null;

    if (!team && profileId) {
      // Fallback: newest team without a synced listing yet
      team = await prisma.team.findFirst({ orderBy: { updatedAt: "desc" } });
    }

    if (team) {
      await syncConnectedAccounts(team.id);
      await prisma.auditLog.create({
        data: {
          teamId: team.id,
          action: "account.connect.callback",
          message: `OAuth callback received for ${platform || "unknown"}`,
          metadata: Object.fromEntries(searchParams.entries()),
        },
      });
      notifyAdminAccountConnected({ teamId: team.id, platform });
    }

    const redirect = new URL("/dashboard/accounts?connected=1", process.env.APP_URL || process.env.NEXTAUTH_URL);
    return NextResponse.redirect(redirect);
  } catch (error) {
    console.error("[accounts/callback]", error);
    const redirect = new URL("/dashboard/accounts?error=connect_failed", process.env.APP_URL || process.env.NEXTAUTH_URL);
    return NextResponse.redirect(redirect);
  }
}

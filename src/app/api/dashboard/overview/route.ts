import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAdWalletUsd } from "@/lib/ad-wallet";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = z.string().min(1).parse(new URL(req.url).searchParams.get("teamId"));
    await requireTeamAccess(teamId, session.user.id);

    const [team, campaigns, recentCampaigns] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        select: { adWalletBalanceCents: true, name: true },
      }),
      prisma.adCampaign.groupBy({
        by: ["lifecycleStatus"],
        where: { teamId, adType: "lacidaweb" },
        _count: { _all: true },
      }),
      prisma.adCampaign.findMany({
        where: { teamId, adType: "lacidaweb" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          lifecycleStatus: true,
          objective: true,
          budgetAmount: true,
          budgetType: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      campaigns.map((row) => [row.lifecycleStatus, row._count._all]),
    );

    const totalCampaigns = campaigns.reduce((sum, row) => sum + row._count._all, 0);
    const pendingReview = statusCounts.PENDING_REVIEW ?? 0;
    const activeCampaigns = statusCounts.ACTIVE ?? 0;

    return NextResponse.json({
      walletBalanceCents: team?.adWalletBalanceCents ?? 0,
      walletBalanceUsd: formatAdWalletUsd(team?.adWalletBalanceCents ?? 0),
      totalCampaigns,
      pendingReview,
      activeCampaigns,
      recentCampaigns: recentCampaigns.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

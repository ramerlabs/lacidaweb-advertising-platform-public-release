import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAdWalletUsd } from "@/lib/ad-wallet";
import { formatTokenCount } from "@/lib/ai-pricing";
import { getAiSettings } from "@/lib/ai-settings";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = z.string().min(1).parse(new URL(req.url).searchParams.get("teamId"));
    await requireTeamAccess(teamId, session.user.id);

    const [team, campaigns, recentCampaigns, usageAgg, aiSettings] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        select: { adWalletBalanceCents: true, name: true, aiTokenBalance: true },
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
      prisma.aiUsageLog.aggregate({
        where: { teamId },
        _sum: { tokensUsed: true },
      }),
      getAiSettings(),
    ]);

    const statusCounts = Object.fromEntries(
      campaigns.map((row) => [row.lifecycleStatus, row._count._all]),
    );

    const totalCampaigns = campaigns.reduce((sum, row) => sum + row._count._all, 0);
    const pendingReview = statusCounts.PENDING_REVIEW ?? 0;
    const activeCampaigns = statusCounts.ACTIVE ?? 0;

    const remainingTokens = team?.aiTokenBalance ?? 0;
    const usedTokens = Math.max(0, usageAgg._sum.tokensUsed ?? 0);
    const packSize = aiSettings.clientPricing.tokensPerPack || 0;
    // Capacity = tokens ever held (used + remaining), floored at one pack for empty accounts.
    const capacityTokens = Math.max(usedTokens + remainingTokens, packSize, 1);
    const usedPercent = Math.min(100, Math.round((usedTokens / capacityTokens) * 100));
    const remainingPercent = Math.min(100, Math.round((remainingTokens / capacityTokens) * 100));

    return NextResponse.json({
      walletBalanceCents: team?.adWalletBalanceCents ?? 0,
      walletBalanceUsd: formatAdWalletUsd(team?.adWalletBalanceCents ?? 0),
      totalCampaigns,
      pendingReview,
      activeCampaigns,
      aiTokens: {
        remaining: remainingTokens,
        used: usedTokens,
        capacity: capacityTokens,
        packSize,
        usedPercent,
        remainingPercent,
        remainingLabel: formatTokenCount(remainingTokens),
        usedLabel: formatTokenCount(usedTokens),
        capacityLabel: formatTokenCount(capacityTokens),
      },
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

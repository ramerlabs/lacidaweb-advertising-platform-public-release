import { NextResponse } from "next/server";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAdWalletUsd } from "@/lib/ad-wallet";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [
      users,
      teams,
      pendingPayments,
      openTickets,
      resolvedTickets,
      monthlyRevenue,
      totalCampaigns,
      pendingReview,
      activeCampaigns,
      walletAgg,
      connectedAccounts,
      totalPosts,
      publishedPosts,
      scheduledPosts,
      unreadInbox,
      teamsWithPublisherSites,
      publisherSites,
      adPlacements,
      placementStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.team.count(),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.supportTicket.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT"] } },
      }),
      prisma.supportTicket.count({ where: { status: "RESOLVED" } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "PAID", createdAt: { gte: monthStart } },
      }),
      prisma.adCampaign.count({ where: { adType: "lacidaweb" } }),
      prisma.adCampaign.count({
        where: { adType: "lacidaweb", lifecycleStatus: "PENDING_REVIEW" },
      }),
      prisma.adCampaign.count({
        where: { adType: "lacidaweb", lifecycleStatus: "ACTIVE" },
      }),
      prisma.team.aggregate({ _sum: { adWalletBalanceCents: true } }),
      prisma.connectedAccount.count(),
      prisma.post.count(),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "SCHEDULED" } }),
      prisma.inboxItem.count({ where: { status: "UNREAD" } }),
      prisma.team.count({
        where: { publisherSites: { some: {} } },
      }),
      prisma.publisherSite.count(),
      prisma.adPlacement.count(),
      prisma.adPlacement.aggregate({ _sum: { impressions: true, clicks: true } }),
    ]);

    const walletTotalCents = walletAgg._sum.adWalletBalanceCents ?? 0;

    return NextResponse.json({
      users,
      teams,
      advertisers: teams,
      publishers: teamsWithPublisherSites,
      publisherSites,
      adPlacements,
      networkImpressions: placementStats._sum.impressions ?? 0,
      networkClicks: placementStats._sum.clicks ?? 0,
      pendingPayments,
      openTickets,
      resolvedTickets,
      revenueMonthCents: monthlyRevenue._sum.amount ?? 0,
      revenueMonthUsd: ((monthlyRevenue._sum.amount ?? 0) / 100).toFixed(2),
      totalCampaigns,
      pendingReview,
      activeCampaigns,
      walletTotalCents,
      walletTotalUsd: formatAdWalletUsd(walletTotalCents),
      connectedAccounts,
      totalPosts,
      publishedPosts,
      scheduledPosts,
      unreadInbox,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

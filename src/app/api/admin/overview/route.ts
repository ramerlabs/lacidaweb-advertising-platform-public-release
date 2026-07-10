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
      teamsWithPublisherSites,
      publisherSites,
      adPlacements,
      placementStats,
      advertiserSpendAll,
      publisherPaidAll,
      advertiserSpendMonth,
      publisherPaidMonth,
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
      prisma.team.count({
        where: { publisherSites: { some: {} } },
      }),
      prisma.publisherSite.count(),
      prisma.adPlacement.count(),
      prisma.adPlacement.aggregate({ _sum: { impressions: true, clicks: true } }),
      prisma.walletTransaction.aggregate({
        _sum: { amountCents: true },
        where: { type: "AD_SPEND", status: "COMPLETED" },
      }),
      prisma.walletTransaction.aggregate({
        _sum: { amountCents: true },
        where: { type: "PUBLISHER_EARNING", status: "COMPLETED" },
      }),
      prisma.walletTransaction.aggregate({
        _sum: { amountCents: true },
        where: { type: "AD_SPEND", status: "COMPLETED", createdAt: { gte: monthStart } },
      }),
      prisma.walletTransaction.aggregate({
        _sum: { amountCents: true },
        where: {
          type: "PUBLISHER_EARNING",
          status: "COMPLETED",
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    const walletTotalCents = walletAgg._sum.adWalletBalanceCents ?? 0;
    const advertiserSpendAllCents = Math.abs(advertiserSpendAll._sum.amountCents ?? 0);
    const publisherPaidAllCents = Math.abs(publisherPaidAll._sum.amountCents ?? 0);
    const advertiserSpendMonthCents = Math.abs(advertiserSpendMonth._sum.amountCents ?? 0);
    const publisherPaidMonthCents = Math.abs(publisherPaidMonth._sum.amountCents ?? 0);
    const adProfitAllCents = advertiserSpendAllCents - publisherPaidAllCents;
    const adProfitMonthCents = advertiserSpendMonthCents - publisherPaidMonthCents;

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
      advertiserSpendAllCents,
      advertiserSpendAllUsd: formatAdWalletUsd(advertiserSpendAllCents),
      publisherPaidAllCents,
      publisherPaidAllUsd: formatAdWalletUsd(publisherPaidAllCents),
      adProfitAllCents,
      adProfitAllUsd: formatAdWalletUsd(adProfitAllCents),
      advertiserSpendMonthCents,
      advertiserSpendMonthUsd: formatAdWalletUsd(advertiserSpendMonthCents),
      publisherPaidMonthCents,
      publisherPaidMonthUsd: formatAdWalletUsd(publisherPaidMonthCents),
      adProfitMonthCents,
      adProfitMonthUsd: formatAdWalletUsd(adProfitMonthCents),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

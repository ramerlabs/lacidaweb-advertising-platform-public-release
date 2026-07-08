import { NextResponse } from "next/server";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAiSettings } from "@/lib/ai-settings";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);

    const aiSettings = await getAiSettings();
    const [usageAgg, tokenPayments, topTeams, totalTokensSold] = await Promise.all([
      prisma.aiUsageLog.aggregate({
        _sum: { chargedCents: true, providerCostCents: true, tokensUsed: true },
        _count: true,
      }),
      prisma.payment.findMany({
        where: { purpose: "AI_CREDITS", status: "PAID" },
        select: { amount: true, aiTokensGranted: true },
      }),
      prisma.team.findMany({
        orderBy: { aiTokenBalance: "desc" },
        take: 5,
        select: { name: true, slug: true, aiTokenBalance: true },
      }),
      prisma.payment.aggregate({
        where: { purpose: "AI_CREDITS", status: "PAID" },
        _sum: { aiTokensGranted: true, amount: true },
      }),
    ]);

    const revenueCents = tokenPayments.reduce((s, p) => s + p.amount * 100, 0);
    const providerCents = usageAgg._sum.providerCostCents || 0;
    const chargedCents = usageAgg._sum.chargedCents || 0;

    return NextResponse.json({
      tokensSold: totalTokensSold._sum.aiTokensGranted || 0,
      tokenRevenueUsd: (totalTokensSold._sum.amount || 0),
      usageCount: usageAgg._count,
      tokensConsumed: usageAgg._sum.tokensUsed || 0,
      estimatedMarginPercent: aiSettings.aiProfitMarginPercent,
      providerCostUsd: (providerCents / 100).toFixed(2),
      chargedUsd: (chargedCents / 100).toFixed(2),
      profitUsd: ((chargedCents - providerCents) / 100).toFixed(2),
      topTeams,
      revenueCents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

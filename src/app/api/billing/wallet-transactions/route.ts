import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { formatAdWalletUsd } from "@/lib/ad-wallet";
import { listTeamWalletTransactions, purgeOldWalletTransactions } from "@/services/wallet-ledger";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const [transactions, team] = await Promise.all([
      listTeamWalletTransactions(teamId, 100),
      prisma.team.findUnique({
        where: { id: teamId },
        select: {
          adWalletBalanceCents: true,
          publisherBalanceCents: true,
        },
      }),
    ]);

    // Opportunistic global cleanup (best-effort).
    void purgeOldWalletTransactions().catch(() => undefined);

    return NextResponse.json({
      retentionDays: 7,
      adWalletBalanceCents: team?.adWalletBalanceCents ?? 0,
      adWalletBalanceUsd: formatAdWalletUsd(team?.adWalletBalanceCents ?? 0),
      publisherBalanceCents: team?.publisherBalanceCents ?? 0,
      publisherBalanceUsd: formatAdWalletUsd(team?.publisherBalanceCents ?? 0),
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amountCents: tx.amountCents,
        amountUsd: formatAdWalletUsd(tx.amountCents),
        balanceAfterCents: tx.balanceAfterCents,
        balanceAfterUsd:
          tx.balanceAfterCents != null ? formatAdWalletUsd(tx.balanceAfterCents) : null,
        description: tx.description,
        metadata: tx.metadata,
        campaignId: tx.campaignId,
        createdAt: tx.createdAt.toISOString(),
        completedAt: tx.completedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

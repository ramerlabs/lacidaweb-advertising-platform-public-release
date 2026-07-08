import { NextResponse } from "next/server";
import { z } from "zod";
import type { PaymentMethod } from "@prisma/client";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAdWalletUsd } from "@/lib/ad-wallet";
import { getAdsSettings } from "@/lib/ads-settings";
import { createAdWalletTopUpPayment } from "@/services/ad-billing";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const [team, settings] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        select: { adWalletBalanceCents: true },
      }),
      getAdsSettings(),
    ]);

    return NextResponse.json({
      adsEnabled: settings.adsEnabled,
      adWalletBalanceCents: team?.adWalletBalanceCents ?? 0,
      adWalletBalanceUsd: formatAdWalletUsd(team?.adWalletBalanceCents ?? 0),
      adWalletTopUpUsd: settings.adWalletTopUpUsd,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

const topUpSchema = z.object({
  teamId: z.string().min(1),
  method: z.enum(["USDT", "PAYPAL", "GCASH", "US_BANK"]),
  proofUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = topUpSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);

    const settings = await getAdsSettings();
    if (!settings.adsEnabled) {
      return NextResponse.json({ error: "Ads are not available" }, { status: 400 });
    }

    const result = await createAdWalletTopUpPayment({
      teamId: body.teamId,
      method: body.method as PaymentMethod,
      proofUrl: body.proofUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

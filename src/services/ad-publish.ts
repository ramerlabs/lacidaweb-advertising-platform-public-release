import { prisma } from "@/lib/prisma";
import { getZernio, withZernioRetry } from "@/lib/zernio";
import { centsToUsd, usdToCents } from "@/lib/ad-wallet";

function unwrap<T>(result: unknown): T {
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data: T }).data;
  }
  return result as T;
}

export async function deductAdWallet(teamId: string, cents: number) {
  if (cents <= 0) throw new Error("Invalid ad wallet charge");

  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({
      where: { id: teamId },
      select: { adWalletBalanceCents: true },
    });
    if (!team || team.adWalletBalanceCents < cents) {
      const have = centsToUsd(team?.adWalletBalanceCents ?? 0);
      const need = centsToUsd(cents);
      throw new Error(`Insufficient ad wallet balance. Need $${need.toFixed(2)}, have $${have.toFixed(2)}.`);
    }
    return tx.team.update({
      where: { id: teamId },
      data: { adWalletBalanceCents: { decrement: cents } },
      select: { adWalletBalanceCents: true },
    });
  });
}

export async function creditAdWallet(teamId: string, cents: number) {
  if (cents <= 0) return;
  await prisma.team.update({
    where: { id: teamId },
    data: { adWalletBalanceCents: { increment: cents } },
  });
}

export async function publishAdCampaignToZernio(campaignId: string) {
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    include: { connectedAccount: true },
  });
  if (!campaign) throw new Error("Ad campaign not found");
  if (campaign.zernioAdId) return campaign;
  if (!campaign.connectedAccount) throw new Error("Ad account connection missing");
  if (!campaign.body || !campaign.headline || !campaign.linkUrl || !campaign.imageUrl) {
    throw new Error("Ad creative is incomplete");
  }

  const account = campaign.connectedAccount;
  const zernio = await getZernio();

  const body: Record<string, unknown> = {
    accountId: account.zernioAccountId,
    adAccountId: campaign.adAccountId,
    name: campaign.name,
    goal: campaign.goal,
    budgetAmount: campaign.budgetAmount,
    budgetType: campaign.budgetType,
    body: campaign.body,
    headline: campaign.headline,
    linkUrl: campaign.linkUrl,
    imageUrl: campaign.imageUrl,
    countries: campaign.countries?.length ? campaign.countries : ["US"],
    status: "PAUSED",
  };

  if (account.platform === "googleads") {
    body.campaignType = "display";
  }

  const result = await withZernioRetry(
    async () => zernio.ads.createStandaloneAd({ body }),
    { label: "ads.createStandaloneAd" },
  );

  const data = unwrap<{ ad?: Record<string, unknown>; message?: string }>(result);
  const ad = data.ad || {};
  const zernioAdId = String(ad._id || ad.id || "");
  const platformCampaignId = String(ad.platformCampaignId || ad.campaignId || "");

  return prisma.adCampaign.update({
    where: { id: campaignId },
    data: {
      zernioAdId: zernioAdId || null,
      platformCampaignId: platformCampaignId || null,
      status: String(ad.status || "pending_review"),
      metadata: ad as object,
    },
  });
}

export function adChargeCents(clientChargeUsd: number): number {
  return usdToCents(clientChargeUsd);
}

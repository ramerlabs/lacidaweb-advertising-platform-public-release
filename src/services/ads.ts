import { prisma } from "@/lib/prisma";
import { getZernio, withZernioRetry } from "@/lib/zernio";
import { getAdsSettings } from "@/lib/ads-settings";
import { clientChargeFromPlatformBudget, formatAdPricing } from "@/lib/ads-pricing";
import { isAdsPlatform, type AdGoalId, type AdsPlatformId } from "@/lib/ads-platforms";
import { ensureTeamZernioProfile } from "@/services/profiles";
import { syncConnectedAccounts } from "@/services/accounts";

const ADS_CONNECT_PLATFORM: Record<AdsPlatformId, string> = {
  metaads: "facebook",
  googleads: "googleads",
  tiktokads: "tiktok",
  linkedinads: "linkedin",
  pinterestads: "pinterest",
  xads: "twitter",
};

function unwrap<T>(result: unknown): T {
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data: T }).data;
  }
  return result as T;
}

export async function startAdsPlatformConnect(input: {
  teamId: string;
  platform: string;
  userId: string;
}) {
  if (!isAdsPlatform(input.platform)) {
    throw new Error("Invalid ads platform");
  }

  const settings = await getAdsSettings();
  if (!settings.adsEnabled) {
    throw new Error("Ads are disabled on this platform");
  }

  const profileId = await ensureTeamZernioProfile(input.teamId);
  const zernio = await getZernio();
  const redirectUrl = `${process.env.APP_URL || process.env.NEXTAUTH_URL}/api/accounts/callback?mode=ads&adsPlatform=${encodeURIComponent(input.platform)}`;
  const connectPlatform = ADS_CONNECT_PLATFORM[input.platform as AdsPlatformId];

  const result = await withZernioRetry(
    async () =>
      zernio.connect.connectAds({
        path: { platform: connectPlatform as "facebook" },
        query: {
          profileId,
          redirect_url: redirectUrl,
          headless: true,
        },
      }),
    { label: "connect.connectAds" },
  );

  const data = unwrap<{ alreadyConnected?: boolean; authUrl?: string; accountId?: string }>(result);
  if (data.alreadyConnected) {
    await syncConnectedAccounts(input.teamId);
    await prisma.auditLog.create({
      data: {
        teamId: input.teamId,
        userId: input.userId,
        action: "ads.connect.already_connected",
        message: `${input.platform} ads account already linked`,
        metadata: { platform: input.platform, accountId: data.accountId },
      },
    });
    return {
      alreadyConnected: true,
      accountId: data.accountId,
      profileId,
      redirectUrl: `${process.env.APP_URL || process.env.NEXTAUTH_URL}/dashboard/ads?connected=1`,
    };
  }

  const authUrl = data.authUrl;

  if (!authUrl) throw new Error("Zernio did not return an OAuth authUrl");

  await prisma.auditLog.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      action: "ads.connect.started",
      message: `Started ${input.platform} ads OAuth connect`,
      metadata: { platform: input.platform, profileId },
    },
  });

  return { authUrl, profileId };
}

export async function listTeamAdsAccounts(teamId: string) {
  const accounts = await prisma.connectedAccount.findMany({
    where: { teamId, isActive: true },
    orderBy: { connectedAt: "desc" },
  });
  return accounts.filter((a) => isAdsPlatform(a.platform));
}

export async function listPlatformAdAccounts(zernioAccountId: string) {
  const zernio = await getZernio();
  const result = await withZernioRetry(
    async () =>
      zernio.ads.listAdAccounts({
        query: { accountId: zernioAccountId },
        accountId: zernioAccountId,
      }),
    { label: "ads.listAdAccounts" },
  );
  const data = unwrap<{ accounts?: Array<Record<string, unknown>> }>(result);
  return (data.accounts || []).map((a) => ({
    id: String(a.id || ""),
    name: String(a.name || a.id || "Ad account"),
    currency: String(a.currency || "USD"),
    status: String(a.status || ""),
  }));
}

export async function listTeamCampaigns(teamId: string, profileId: string) {
  const zernio = await getZernio();
  const result = await withZernioRetry(
    async () =>
      zernio.adcampaigns.listAdCampaigns({
        query: { profileId, source: "all", limit: 50 },
        profileId,
        source: "all",
        limit: 50,
      }),
    { label: "adcampaigns.listAdCampaigns" },
  );
  const data = unwrap<{ campaigns?: Array<Record<string, unknown>> }>(result);
  return data.campaigns || [];
}

export async function createStandaloneAd(input: {
  teamId: string;
  userId: string;
  connectedAccountId: string;
  adAccountId: string;
  name: string;
  goal: AdGoalId;
  body: string;
  headline: string;
  linkUrl: string;
  imageUrl: string;
  budgetAmount: number;
  budgetType: "daily" | "lifetime";
  countries?: string[];
  status?: "ACTIVE" | "PAUSED";
}) {
  const settings = await getAdsSettings();
  if (!settings.adsEnabled) throw new Error("Ads are disabled on this platform");

  const account = await prisma.connectedAccount.findFirst({
    where: { id: input.connectedAccountId, teamId: input.teamId, isActive: true },
  });
  if (!account || !isAdsPlatform(account.platform)) {
    throw new Error("Ads account connection not found");
  }

  const pricing = formatAdPricing(input.budgetAmount, settings.adsProfitMarginPercent);
  const zernio = await getZernio();

  const body: Record<string, unknown> = {
    accountId: account.zernioAccountId,
    adAccountId: input.adAccountId,
    name: input.name,
    goal: input.goal,
    budgetAmount: input.budgetAmount,
    budgetType: input.budgetType,
    body: input.body,
    headline: input.headline,
    linkUrl: input.linkUrl,
    imageUrl: input.imageUrl,
    countries: input.countries?.length ? input.countries : ["US"],
    status: input.status || "PAUSED",
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

  const record = await prisma.adCampaign.create({
    data: {
      teamId: input.teamId,
      connectedAccountId: account.id,
      zernioAdId: zernioAdId || null,
      platformCampaignId: platformCampaignId || null,
      platform: account.platform,
      adAccountId: input.adAccountId,
      name: input.name,
      goal: input.goal,
      adType: "standalone",
      status: String(ad.status || "pending_review"),
      budgetAmount: input.budgetAmount,
      budgetType: input.budgetType,
      platformBudgetUsd: pricing.platformBudgetUsd,
      clientChargeUsd: pricing.clientChargeUsd,
      headline: input.headline,
      body: input.body,
      linkUrl: input.linkUrl,
      imageUrl: input.imageUrl,
      countries: input.countries || ["US"],
      metadata: ad as object,
    },
  });

  await prisma.auditLog.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      action: "ads.campaign.created",
      message: `Created ad campaign "${input.name}"`,
      metadata: {
        adCampaignId: record.id,
        zernioAdId,
        clientChargeUsd: pricing.clientChargeUsd,
        platformBudgetUsd: pricing.platformBudgetUsd,
      },
    },
  });

  return { campaign: record, ad, pricing, message: data.message };
}

function zernioPlatformForStatus(platform: string): string {
  if (platform === "metaads") return "facebook";
  if (platform.endsWith("ads")) return platform.replace("ads", "");
  return platform;
}

export async function updateCampaignStatus(input: {
  teamId: string;
  userId: string;
  platformCampaignId: string;
  platform: string;
  status: "ACTIVE" | "PAUSED";
}) {
  const zernio = await getZernio();
  const zernioPlatform = zernioPlatformForStatus(input.platform);
  await withZernioRetry(
    async () =>
      zernio.adcampaigns.updateAdCampaignStatus({
        path: { campaignId: input.platformCampaignId },
        body: { platform: zernioPlatform, status: input.status },
        campaignId: input.platformCampaignId,
        platform: zernioPlatform,
        status: input.status,
      }),
    { label: "adcampaigns.updateAdCampaignStatus" },
  );

  await prisma.adCampaign.updateMany({
    where: { teamId: input.teamId, platformCampaignId: input.platformCampaignId },
    data: { status: input.status.toLowerCase() },
  });

  await prisma.auditLog.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      action: "ads.campaign.status",
      message: `Campaign ${input.status.toLowerCase()}`,
      metadata: { platformCampaignId: input.platformCampaignId, status: input.status },
    },
  });
}

export async function handleAdStatusChanged(payload: Record<string, unknown>) {
  const adObject = (payload.adObject || {}) as Record<string, unknown>;
  const status = (payload.status || {}) as Record<string, unknown>;
  const account = (payload.account || {}) as Record<string, unknown>;

  const platformCampaignId = String(adObject.platformId || "");
  const rawStatus = String(status.raw || "").toLowerCase();
  const accountId = String(account.accountId || "");

  if (!platformCampaignId && !accountId) return;

  const connected = accountId
    ? await prisma.connectedAccount.findUnique({ where: { zernioAccountId: accountId } })
    : null;

  const mappedStatus =
    rawStatus === "active"
      ? "active"
      : rawStatus === "paused"
        ? "paused"
        : rawStatus === "pending_review"
          ? "pending_review"
          : rawStatus === "with_issues" || rawStatus === "disapproved"
            ? "rejected"
            : rawStatus || "unknown";

  if (platformCampaignId) {
    await prisma.adCampaign.updateMany({
      where: connected?.teamId
        ? { teamId: connected.teamId, platformCampaignId }
        : { platformCampaignId },
      data: { status: mappedStatus },
    });
  }
}

export { clientChargeFromPlatformBudget, formatAdPricing };

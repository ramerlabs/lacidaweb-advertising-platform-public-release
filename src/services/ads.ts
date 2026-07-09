import { prisma } from "@/lib/prisma";
import { getZernio, withZernioRetry } from "@/lib/zernio";
import { getAdsSettings } from "@/lib/ads-settings";
import { isAdsPlatform, type AdGoalId, type AdsPlatformId } from "@/lib/ads-platforms";
import { ensureTeamZernioProfile } from "@/services/profiles";
import { syncConnectedAccounts } from "@/services/accounts";
import { publishAdCampaignToZernio } from "@/services/ad-publish";

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

  const budgetUsd = input.budgetAmount;

  const record = await prisma.adCampaign.create({
    data: {
      teamId: input.teamId,
      connectedAccountId: account.id,
      platform: account.platform,
      adAccountId: input.adAccountId,
      name: input.name,
      goal: input.goal,
      adType: "standalone",
      budgetAmount: input.budgetAmount,
      budgetType: input.budgetType,
      platformBudgetUsd: budgetUsd,
      clientChargeUsd: budgetUsd,
      headline: input.headline,
      body: input.body,
      linkUrl: input.linkUrl,
      imageUrl: input.imageUrl,
      countries: input.countries?.length ? input.countries : ["US"],
      status: "pending_review",
      paymentStatus: "not_required",
    },
  });

  try {
    const published = await publishAdCampaignToZernio(record.id);
    await prisma.auditLog.create({
      data: {
        teamId: input.teamId,
        userId: input.userId,
        action: "ads.campaign.created",
        message: `Created ad campaign "${input.name}" on client's ad account`,
        metadata: {
          adCampaignId: published.id,
          zernioAdId: published.zernioAdId,
          budgetUsd,
        },
      },
    });
    return {
      campaign: published,
      message: "Ad submitted to your connected ad account — pending platform review",
    };
  } catch (error) {
    await prisma.adCampaign.update({
      where: { id: record.id },
      data: { status: "failed" },
    });
    throw error;
  }
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

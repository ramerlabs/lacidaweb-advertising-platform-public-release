import { NextResponse } from "next/server";
import { syncConnectedAccounts } from "@/services/accounts";
import { prisma } from "@/lib/prisma";
import { notifyAdminAccountConnected } from "@/services/admin-notify";
import {
  autoCompleteFacebookAdsConnect,
  isConnectComplete,
  needsConnectSelection,
  parseHeadlessCallback,
} from "@/services/connect-headless";

function appUrl(path: string) {
  return new URL(path, process.env.APP_URL || process.env.NEXTAUTH_URL);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const params = parseHeadlessCallback(searchParams);
    const profileId = params.profileId;
    const platform = searchParams.get("adsPlatform") || params.platform || searchParams.get("platform");
    const mode = searchParams.get("mode") === "ads" ? "ads" : params.mode || "organic";

    let team = profileId
      ? await prisma.team.findFirst({ where: { zernioProfileId: profileId } })
      : null;

    if (!team && profileId) {
      team = await prisma.team.findFirst({ orderBy: { updatedAt: "desc" } });
    }

    if (!team) {
      return NextResponse.redirect(appUrl("/dashboard/accounts?error=team_not_found"));
    }

    if (isConnectComplete(params)) {
      await syncConnectedAccounts(team.id);
      await prisma.auditLog.create({
        data: {
          teamId: team.id,
          action: "account.connect.callback",
          message: `OAuth complete for ${platform || "unknown"}`,
          metadata: Object.fromEntries(searchParams.entries()),
        },
      });
      notifyAdminAccountConnected({ teamId: team.id, platform: platform || undefined });

      const successPath =
        mode === "ads" || (platform && platform.endsWith("ads"))
          ? "/dashboard/ads?connected=1"
          : "/dashboard/accounts?connected=1";
      return NextResponse.redirect(appUrl(successPath));
    }

    if (needsConnectSelection(params)) {
      const adsPlatform = searchParams.get("adsPlatform") || "";
      const isAdsFacebook =
        mode === "ads" &&
        (params.step === "select_page" || platform === "facebook" || adsPlatform === "metaads");

      if (isAdsFacebook) {
        await autoCompleteFacebookAdsConnect({
          params: { ...params, platform: platform || "facebook", mode: "ads" },
          teamId: team.id,
        });
        await syncConnectedAccounts(team.id);
        notifyAdminAccountConnected({ teamId: team.id, platform: adsPlatform || "metaads" });
        return NextResponse.redirect(appUrl("/dashboard/ads?connected=1"));
      }

      const selectUrl = appUrl("/dashboard/accounts/select");
      selectUrl.searchParams.set("teamId", team.id);
      if (profileId) selectUrl.searchParams.set("profileId", profileId);
      if (platform) selectUrl.searchParams.set("platform", platform);
      if (params.step) selectUrl.searchParams.set("step", params.step);
      if (params.tempToken) selectUrl.searchParams.set("tempToken", params.tempToken);
      if (params.userProfileRaw) selectUrl.searchParams.set("userProfile", params.userProfileRaw);
      if (params.connectToken) selectUrl.searchParams.set("connect_token", params.connectToken);
      if (params.pendingDataToken) selectUrl.searchParams.set("pendingDataToken", params.pendingDataToken);
      if (mode === "ads") selectUrl.searchParams.set("mode", "ads");
      if (adsPlatform) selectUrl.searchParams.set("adsPlatform", adsPlatform);
      return NextResponse.redirect(selectUrl);
    }

    await syncConnectedAccounts(team.id);
    return NextResponse.redirect(appUrl("/dashboard/accounts?connected=1"));
  } catch (error) {
    console.error("[accounts/callback]", error);
    const message = error instanceof Error ? error.message : "connect_failed";
    return NextResponse.redirect(
      appUrl(`/dashboard/accounts?error=${encodeURIComponent(message)}`),
    );
  }
}

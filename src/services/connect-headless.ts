import { getZernio, withZernioRetry } from "@/lib/zernio";

export type HeadlessCallbackParams = {
  profileId: string;
  platform: string;
  step?: string;
  tempToken?: string;
  userProfileRaw?: string;
  connectToken?: string;
  pendingDataToken?: string;
  accountId?: string;
  connected?: string;
  username?: string;
  mode?: "organic" | "ads";
};

export type ConnectOption = {
  id: string;
  name: string;
  subtitle?: string;
  raw?: Record<string, unknown>;
};

function unwrap<T>(result: unknown): T {
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data: T }).data;
  }
  return result as T;
}

function parseUserProfile(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

export function parseHeadlessCallback(searchParams: URLSearchParams): HeadlessCallbackParams {
  return {
    profileId: searchParams.get("profileId") || "",
    platform: searchParams.get("platform") || searchParams.get("connected") || "",
    step: searchParams.get("step") || undefined,
    tempToken: searchParams.get("tempToken") || undefined,
    userProfileRaw: searchParams.get("userProfile") || undefined,
    connectToken: searchParams.get("connect_token") || searchParams.get("connectToken") || undefined,
    pendingDataToken: searchParams.get("pendingDataToken") || undefined,
    accountId: searchParams.get("accountId") || undefined,
    connected: searchParams.get("connected") || undefined,
    username: searchParams.get("username") || undefined,
    mode: searchParams.get("mode") === "ads" ? "ads" : "organic",
  };
}

export function isConnectComplete(params: HeadlessCallbackParams): boolean {
  if (params.accountId) return true;
  if (params.connected && !params.step && !params.pendingDataToken) return true;
  return false;
}

export function needsConnectSelection(params: HeadlessCallbackParams): boolean {
  if (isConnectComplete(params)) return false;
  return Boolean(params.step || params.pendingDataToken || params.tempToken);
}

function appBaseUrl() {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "";
}

function finalRedirectUrl(teamId: string, platform: string) {
  const base = appBaseUrl();
  const path =
    platform.endsWith("ads") || ["metaads", "googleads", "tiktokads", "linkedinads", "pinterestads", "xads"].includes(platform)
      ? "/dashboard/ads"
      : "/dashboard/accounts";
  return `${base}${path}?connected=1&platform=${encodeURIComponent(platform)}&teamId=${encodeURIComponent(teamId)}`;
}

function connectHeaders(connectToken?: string) {
  return connectToken ? { "X-Connect-Token": connectToken } : undefined;
}

export async function listConnectOptions(input: HeadlessCallbackParams): Promise<{
  options: ConnectOption[];
  selectionLabel: string;
  userProfile: Record<string, unknown>;
  tempToken?: string;
}> {
  const zernio = await getZernio();
  const userProfile = parseUserProfile(input.userProfileRaw);

  if (input.pendingDataToken) {
    const pending = unwrap<{
      platform?: string;
      tempToken?: string;
      userProfile?: Record<string, unknown>;
      selectionType?: string;
      organizations?: Array<{ id: string; name: string; vanityName?: string }>;
      boards?: Array<{ id: string; name: string }>;
      profiles?: Array<{ id: string; name: string; username?: string }>;
    }>(
      await withZernioRetry(
        async () =>
          zernio.connect.getPendingOAuthData({
            query: { token: input.pendingDataToken! },
          }),
        { label: "connect.getPendingOAuthData" },
      ),
    );

    const platform = pending.platform || input.platform;
    if (pending.organizations?.length) {
      return {
        options: pending.organizations.map((o) => ({
          id: o.id,
          name: o.name || o.vanityName || o.id,
          subtitle: o.vanityName,
          raw: o as Record<string, unknown>,
        })),
        selectionLabel: "Select a LinkedIn organization",
        userProfile: pending.userProfile || userProfile,
        tempToken: pending.tempToken || input.tempToken,
      };
    }
    if (pending.boards?.length) {
      return {
        options: pending.boards.map((b) => ({ id: b.id, name: b.name })),
        selectionLabel: "Select a Pinterest board",
        userProfile: pending.userProfile || userProfile,
        tempToken: pending.tempToken || input.tempToken,
      };
    }
    if (pending.profiles?.length) {
      return {
        options: pending.profiles.map((p) => ({
          id: p.id,
          name: p.name,
          subtitle: p.username,
        })),
        selectionLabel: "Select a Snapchat profile",
        userProfile: pending.userProfile || userProfile,
        tempToken: pending.tempToken || input.tempToken,
      };
    }

    throw new Error(`No selection options for ${platform}`);
  }

  if (!input.tempToken || !input.profileId) {
    throw new Error("Missing OAuth session data");
  }

  const platform = input.platform;
  const step = input.step || "";

  if (platform === "facebook" || platform === "instagram" || step === "select_page") {
    const pages = unwrap<{ pages?: Array<{ id: string; name: string; category?: string }> }>(
      await withZernioRetry(
        async () =>
          zernio.connect.facebook.listFacebookPages({
            query: { profileId: input.profileId, tempToken: input.tempToken! },
            headers: connectHeaders(input.connectToken),
          }),
        { label: "connect.listFacebookPages" },
      ),
    );
    return {
      options: (pages.pages || []).map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.category,
      })),
      selectionLabel: "Select a Facebook Page",
      userProfile,
      tempToken: input.tempToken,
    };
  }

  if (platform === "linkedin" || step.includes("organization")) {
    throw new Error("LinkedIn selection requires pending OAuth data — restart the connect flow");
  }

  if (platform === "pinterest" || step.includes("board")) {
    const boards = unwrap<{ boards?: Array<{ id: string; name: string }> }>(
      await withZernioRetry(
        async () =>
          zernio.connect.pinterest.listPinterestBoardsForSelection({
            query: { profileId: input.profileId, tempToken: input.tempToken! },
          }),
        { label: "connect.listPinterestBoards" },
      ),
    );
    return {
      options: (boards.boards || []).map((b) => ({ id: b.id, name: b.name })),
      selectionLabel: "Select a Pinterest board",
      userProfile,
      tempToken: input.tempToken,
    };
  }

  if (platform === "googlebusiness" || step.includes("location")) {
    const locations = unwrap<{ locations?: Array<{ id: string; name: string; address?: string }> }>(
      await withZernioRetry(
        async () =>
          zernio.connect.googleBusiness.listGoogleBusinessLocations({
            query: { profileId: input.profileId, tempToken: input.tempToken! },
          }),
        { label: "connect.listGoogleBusinessLocations" },
      ),
    );
    return {
      options: (locations.locations || []).map((l) => ({
        id: l.id,
        name: l.name,
        subtitle: l.address,
      })),
      selectionLabel: "Select a business location",
      userProfile,
      tempToken: input.tempToken,
    };
  }

  if (platform === "snapchat" || step.includes("profile")) {
    const profiles = unwrap<{ publicProfiles?: Array<{ id: string; display_name?: string; username?: string }> }>(
      await withZernioRetry(
        async () =>
          zernio.connect.snapchat.listSnapchatProfiles({
            query: { profileId: input.profileId, tempToken: input.tempToken! },
            ...(input.connectToken
              ? { headers: { "X-Connect-Token": input.connectToken } }
              : {}),
          }),
        { label: "connect.listSnapchatProfiles" },
      ),
    );
    return {
      options: (profiles.publicProfiles || []).map((p) => ({
        id: p.id,
        name: p.display_name || p.username || p.id,
        subtitle: p.username,
        raw: p as Record<string, unknown>,
      })),
      selectionLabel: "Select a Snapchat profile",
      userProfile,
      tempToken: input.tempToken,
    };
  }

  if (platform === "whatsapp" || step.includes("phone")) {
    const phones = unwrap<{
      phoneNumbers?: Array<{
        id?: string;
        display_phone_number?: string;
        verified_name?: string;
        wabaId?: string;
      }>;
    }>(
      await withZernioRetry(
        async () =>
          zernio.connect.listWhatsAppPhoneNumbers({
            query: { profileId: input.profileId, tempToken: input.tempToken! },
          }),
        { label: "connect.listWhatsAppPhoneNumbers" },
      ),
    );
    return {
      options: (phones.phoneNumbers || [])
        .filter((p) => p.id)
        .map((p) => ({
          id: p.id!,
          name: p.verified_name || p.display_phone_number || p.id!,
          subtitle: p.display_phone_number,
          raw: { wabaId: p.wabaId },
        })),
      selectionLabel: "Select a WhatsApp number",
      userProfile,
      tempToken: input.tempToken,
    };
  }

  throw new Error(`Unsupported selection step for ${platform}`);
}

export async function completeConnectSelection(input: {
  params: HeadlessCallbackParams;
  teamId: string;
  selectedId: string;
  selectedRaw?: Record<string, unknown>;
  tempToken?: string;
  userProfile?: Record<string, unknown>;
}): Promise<{ accountId?: string }> {
  const zernio = await getZernio();
  const { params, teamId, selectedId } = input;
  const profileId = params.profileId;
  const tempToken = input.tempToken || params.tempToken;
  const userProfile = input.userProfile || parseUserProfile(params.userProfileRaw);
  const redirectUrl = finalRedirectUrl(teamId, params.platform);
  const platform = params.platform;
  const step = params.step || "";

  if (!tempToken) throw new Error("OAuth session expired — try connecting again");

  const bodyBase = {
    profileId,
    tempToken,
    userProfile: userProfile as { id?: string; name?: string; profilePicture?: string },
    redirect_url: redirectUrl,
  };

  if (platform === "facebook" || platform === "instagram" || step === "select_page") {
    const result = unwrap<{ account?: { accountId?: string }; redirect_url?: string }>(
      await withZernioRetry(
        async () =>
          zernio.connect.facebook.selectFacebookPage({
            body: { ...bodyBase, pageId: selectedId },
          }),
        { label: "connect.selectFacebookPage" },
      ),
    );
    return { accountId: result.account?.accountId };
  }

  if (platform === "linkedin" || step.includes("organization")) {
    const result = unwrap<{ account?: { accountId?: string } }>(
      await withZernioRetry(
        async () =>
          zernio.connect.linkedin.selectLinkedInOrganization({
            body: {
              profileId,
              tempToken,
              userProfile,
              accountType: "organization",
              selectedOrganization: input.selectedRaw || { id: selectedId },
              redirect_url: redirectUrl,
            },
          }),
        { label: "connect.selectLinkedInOrganization" },
      ),
    );
    return { accountId: result.account?.accountId };
  }

  if (platform === "pinterest" || step.includes("board")) {
    const result = unwrap<{ account?: { accountId?: string } }>(
      await withZernioRetry(
        async () =>
          zernio.connect.pinterest.selectPinterestBoard({
            body: { ...bodyBase, boardId: selectedId },
          }),
        { label: "connect.selectPinterestBoard" },
      ),
    );
    return { accountId: result.account?.accountId };
  }

  if (platform === "googlebusiness" || step.includes("location")) {
    const result = unwrap<{ account?: { accountId?: string } }>(
      await withZernioRetry(
        async () =>
          zernio.connect.googleBusiness.selectGoogleBusinessLocation({
            body: { ...bodyBase, locationId: selectedId },
          }),
        { label: "connect.selectGoogleBusinessLocation" },
      ),
    );
    return { accountId: result.account?.accountId };
  }

  if (platform === "snapchat" || step.includes("profile")) {
    const raw = input.selectedRaw || {};
    const result = unwrap<{ account?: { accountId?: string } }>(
      await withZernioRetry(
        async () =>
          zernio.connect.snapchat.selectSnapchatProfile({
            body: {
              profileId,
              tempToken,
              userProfile: bodyBase.userProfile,
              selectedPublicProfile: {
                id: selectedId,
                display_name: String(raw.display_name || raw.name || selectedId),
                username: String(raw.username || ""),
              },
              redirect_url: redirectUrl,
            },
          }),
        { label: "connect.selectSnapchatProfile" },
      ),
    );
    return { accountId: result.account?.accountId };
  }

  if (platform === "whatsapp" || step.includes("phone")) {
    const wabaId = String(input.selectedRaw?.wabaId || "");
    if (!wabaId) throw new Error("Missing WhatsApp business account — try connecting again");
    const result = unwrap<{ account?: { accountId?: string } }>(
      await withZernioRetry(
        async () =>
          zernio.connect.completeWhatsAppPhoneSelection({
            body: {
              profileId,
              phoneNumberId: selectedId,
              wabaId,
              tempToken,
              userProfile: bodyBase.userProfile,
              redirect_url: redirectUrl,
            },
          }),
        { label: "connect.completeWhatsAppPhoneSelection" },
      ),
    );
    return { accountId: result.account?.accountId };
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

/** Auto-pick first Facebook page for ads-only headless connect (no picker UI). */
export async function autoCompleteFacebookAdsConnect(input: {
  params: HeadlessCallbackParams;
  teamId: string;
}): Promise<{ accountId?: string }> {
  const listed = await listConnectOptions(input.params);
  const first = listed.options[0];
  if (!first) {
    throw new Error("No Facebook Pages found on this account");
  }
  return completeConnectSelection({
    params: { ...input.params, platform: input.params.platform || "facebook" },
    teamId: input.teamId,
    selectedId: first.id,
    tempToken: listed.tempToken,
    userProfile: listed.userProfile,
  });
}

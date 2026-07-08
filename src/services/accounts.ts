import { prisma } from "@/lib/prisma";
import { getZernio, withZernioRetry } from "@/lib/zernio";
import { ensureTeamZernioProfile } from "@/services/profiles";
import type { PlatformId } from "@/lib/utils";

export async function startAccountConnect(input: {
  teamId: string;
  platform: PlatformId;
  userId: string;
}) {
  const profileId = await ensureTeamZernioProfile(input.teamId);
  const zernio = await getZernio();
  const redirectUrl = `${process.env.APP_URL || process.env.NEXTAUTH_URL}/api/accounts/callback`;

  const result = await withZernioRetry(
    async () =>
      zernio.connect.getConnectUrl({
        platform: input.platform,
        profileId,
        // @ts-expect-error SDK version differences for nested params
        path: { platform: input.platform },
        query: {
          profileId,
          redirect_url: redirectUrl,
        },
        redirect_url: redirectUrl,
      }),
    { label: "connect.getConnectUrl" },
  );

  const authUrl =
    (result as { authUrl?: string }).authUrl ||
    (result as { data?: { authUrl?: string } }).data?.authUrl ||
    (result as { data?: { data?: { authUrl?: string } } }).data?.data?.authUrl;

  if (!authUrl) {
    throw new Error("Zernio did not return an OAuth authUrl");
  }

  await prisma.auditLog.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      action: "account.connect.started",
      message: `Started ${input.platform} OAuth connect`,
      metadata: { platform: input.platform, profileId },
    },
  });

  return { authUrl, profileId };
}

export async function syncConnectedAccounts(teamId: string) {
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
  if (!team.zernioProfileId) {
    return [];
  }

  const zernio = await getZernio();
  const result = await withZernioRetry(
    async () =>
      zernio.accounts.listAccounts({
        // @ts-expect-error query optional across SDK versions
        query: { profileId: team.zernioProfileId },
      }),
    { label: "accounts.listAccounts" },
  );

  const accounts =
    (result as { accounts?: Array<Record<string, unknown>> }).accounts ||
    (result as { data?: { accounts?: Array<Record<string, unknown>> } }).data?.accounts ||
    [];

  const upserted = [];

  for (const account of accounts) {
    const zernioAccountId = String(account._id || account.id || "");
    if (!zernioAccountId) continue;

    const platform = String(account.platform || "unknown");
    const profileId = String(
      account.profileId || account.profile_id || team.zernioProfileId,
    );

    const row = await prisma.connectedAccount.upsert({
      where: { zernioAccountId },
      create: {
        teamId,
        platform,
        zernioAccountId,
        zernioProfileId: profileId,
        username: (account.username as string) || null,
        displayName:
          (account.displayName as string) ||
          (account.name as string) ||
          (account.username as string) ||
          null,
        avatarUrl: (account.avatarUrl as string) || (account.profilePicture as string) || null,
        metadata: account as object,
        isActive: true,
      },
      update: {
        platform,
        username: (account.username as string) || null,
        displayName:
          (account.displayName as string) ||
          (account.name as string) ||
          (account.username as string) ||
          null,
        avatarUrl: (account.avatarUrl as string) || (account.profilePicture as string) || null,
        metadata: account as object,
        isActive: true,
      },
    });

    upserted.push(row);
  }

  return upserted;
}

export async function disconnectAccount(teamId: string, connectedAccountId: string) {
  const account = await prisma.connectedAccount.findFirst({
    where: { id: connectedAccountId, teamId },
  });
  if (!account) throw new Error("Connected account not found");

  const zernio = await getZernio();
  try {
    await withZernioRetry(
      async () =>
        zernio.accounts.deleteAccount({
          // @ts-expect-error path shape varies
          path: { accountId: account.zernioAccountId },
          accountId: account.zernioAccountId,
        }),
      { label: "accounts.deleteAccount" },
    );
  } catch (error) {
    console.error("[disconnectAccount] remote delete failed", error);
  }

  await prisma.connectedAccount.update({
    where: { id: account.id },
    data: { isActive: false },
  });
}

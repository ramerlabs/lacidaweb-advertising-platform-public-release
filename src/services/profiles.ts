import { prisma } from "@/lib/prisma";
import { getZernio, withZernioRetry } from "@/lib/zernio";

export async function ensureTeamZernioProfile(teamId: string): Promise<string> {
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });

  if (team.zernioProfileId) {
    return team.zernioProfileId;
  }

  const zernio = await getZernio();
  const result = await withZernioRetry(
    async () =>
      zernio.profiles.createProfile({
        // SDK shapes vary slightly across versions; support common patterns.
        // @ts-ignore SDK version variance
        body: {
          name: team.name,
          description: `Profile for team ${team.slug}`,
        },
        name: team.name,
        description: `Profile for team ${team.slug}`,
      }),
    { label: "profiles.createProfile" },
  );

  const profile =
    (result as { profile?: { _id?: string; id?: string } }).profile ??
    (result as { data?: { profile?: { _id?: string; id?: string }; _id?: string } }).data
      ?.profile ??
    (result as { data?: { _id?: string } }).data ??
    (result as { _id?: string });

  const profileId =
    (profile as { _id?: string })?._id ||
    (profile as { id?: string })?.id ||
    (result as { data?: { _id?: string } }).data?._id;

  if (!profileId) {
    throw new Error("Failed to create Zernio profile: missing id");
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { zernioProfileId: profileId },
  });

  await prisma.auditLog.create({
    data: {
      teamId,
      action: "zernio.profile.created",
      message: `Created Zernio profile ${profileId}`,
      metadata: { profileId },
    },
  });

  return profileId;
}

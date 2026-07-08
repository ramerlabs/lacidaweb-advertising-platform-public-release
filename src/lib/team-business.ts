import { prisma } from "@/lib/prisma";

export type TeamBusinessProfile = {
  businessName: string | null;
  businessDescription: string | null;
  businessIndustry: string | null;
  businessAudience: string | null;
  businessWebsite: string | null;
  businessLocation: string | null;
  brandVoice: string | null;
};

export const BUSINESS_PROFILE_SELECT = {
  name: true,
  businessName: true,
  businessDescription: true,
  businessIndustry: true,
  businessAudience: true,
  businessWebsite: true,
  businessLocation: true,
  brandVoice: true,
} as const;

export function toBusinessProfile(
  team: TeamBusinessProfile & { name?: string },
): TeamBusinessProfile {
  return {
    businessName: team.businessName,
    businessDescription: team.businessDescription,
    businessIndustry: team.businessIndustry,
    businessAudience: team.businessAudience,
    businessWebsite: team.businessWebsite,
    businessLocation: team.businessLocation,
    brandVoice: team.brandVoice,
  };
}

export function isBusinessProfileComplete(profile: TeamBusinessProfile): boolean {
  const hasDescription = Boolean(profile.businessDescription?.trim());
  const hasIdentity = Boolean(
    profile.businessName?.trim() || profile.businessIndustry?.trim(),
  );
  return hasDescription && hasIdentity;
}

export function formatBusinessContext(
  profile: TeamBusinessProfile,
  teamName?: string,
): string {
  const lines: string[] = [];

  const name = profile.businessName?.trim() || teamName?.trim();
  if (name) lines.push(`Business/brand: ${name}`);
  if (profile.businessIndustry?.trim()) lines.push(`Industry: ${profile.businessIndustry.trim()}`);
  if (profile.businessDescription?.trim()) {
    lines.push(`What they do: ${profile.businessDescription.trim()}`);
  }
  if (profile.businessAudience?.trim()) {
    lines.push(`Target audience: ${profile.businessAudience.trim()}`);
  }
  if (profile.businessWebsite?.trim()) lines.push(`Website: ${profile.businessWebsite.trim()}`);
  if (profile.businessLocation?.trim()) lines.push(`Location: ${profile.businessLocation.trim()}`);
  if (profile.brandVoice?.trim()) lines.push(`Brand voice: ${profile.brandVoice.trim()}`);

  return lines.join("\n");
}

export async function getTeamBusinessContext(teamId: string): Promise<{
  profile: TeamBusinessProfile;
  context: string;
  complete: boolean;
}> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: BUSINESS_PROFILE_SELECT,
  });
  if (!team) throw new Error("Team not found");

  const profile = toBusinessProfile(team);
  return {
    profile,
    context: formatBusinessContext(profile, team.name),
    complete: isBusinessProfileComplete(profile),
  };
}

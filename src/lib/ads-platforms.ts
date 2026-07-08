export const AD_PLATFORMS = [
  { id: "metaads", label: "Meta Ads", description: "Facebook & Instagram ads" },
  { id: "googleads", label: "Google Ads", description: "Search & Display campaigns" },
  { id: "tiktokads", label: "TikTok Ads", description: "TikTok & Spark Ads" },
  { id: "linkedinads", label: "LinkedIn Ads", description: "B2B sponsored content" },
  { id: "pinterestads", label: "Pinterest Ads", description: "Promoted pins" },
  { id: "xads", label: "X Ads", description: "Promoted posts on X" },
] as const;

export type AdsPlatformId = (typeof AD_PLATFORMS)[number]["id"];

export const AD_GOALS = [
  { id: "engagement", label: "Engagement" },
  { id: "traffic", label: "Traffic" },
  { id: "awareness", label: "Awareness" },
  { id: "video_views", label: "Video Views" },
] as const;

export type AdGoalId = (typeof AD_GOALS)[number]["id"];

const AD_PLATFORM_IDS = new Set<string>(AD_PLATFORMS.map((p) => p.id));

export function isAdsPlatform(platform: string): platform is AdsPlatformId {
  return AD_PLATFORM_IDS.has(platform);
}

/** Map organic platform to preferred ads connect platform when boosting. */
export function organicToAdsPlatform(platform: string): AdsPlatformId | null {
  const map: Record<string, AdsPlatformId> = {
    facebook: "metaads",
    instagram: "metaads",
    googlebusiness: "googleads",
    tiktok: "tiktokads",
    linkedin: "linkedinads",
    pinterest: "pinterestads",
    twitter: "xads",
  };
  return map[platform] || null;
}

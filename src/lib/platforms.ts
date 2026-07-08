import { PLATFORMS } from "@/lib/utils";

/** Marketing display list — includes organic + ads platforms shown on the landing page */
export const LANDING_PLATFORMS = [
  ...PLATFORMS,
  { id: "google-ads", label: "Google Ads" },
  { id: "meta-ads", label: "Meta Ads" },
  { id: "tiktok-ads", label: "TikTok Ads" },
  { id: "x-ads", label: "X Ads" },
  { id: "linkedin-ads", label: "LinkedIn Ads" },
  { id: "pinterest-ads", label: "Pinterest Ads" },
] as const;

export const UNLIMITED_HIGHLIGHTS = [
  "Post unlimited content across every connected channel",
  "Schedule unlimited posts — no caps on your publishing calendar",
  "Every feature included on every plan",
] as const;

import { brand } from "@/lib/brand";
import { prisma } from "@/lib/prisma";

export type SiteSettingsData = {
  title: string;
  product: string;
  description: string;
  logoUrl: string;
  logoDarkUrl: string;
  logoHeightPx: number;
  faviconUrl: string;
  domain: string;
  tagline: string;
  supportEmail: string;
  url: string;
  activityFeedDisplayCount: number;
  activityFeedSimulatedEnabled: boolean;
};

export type DisplaySettingsData = Pick<
  SiteSettingsData,
  "activityFeedDisplayCount" | "activityFeedSimulatedEnabled"
>;

const STATIC_DEFAULTS = {
  domain: brand.domain,
  tagline: brand.tagline,
  url: brand.url,
};

const DEFAULTS: SiteSettingsData = {
  title: brand.name,
  product: brand.product,
  description: brand.positioning,
  logoUrl: brand.logoUrl,
  logoDarkUrl: "",
  logoHeightPx: 40,
  faviconUrl: brand.faviconUrl,
  supportEmail: brand.supportEmail,
  activityFeedDisplayCount: 20,
  activityFeedSimulatedEnabled: true,
  ...STATIC_DEFAULTS,
};

function normalizeAssetUrl(url: string | null | undefined, fallback: string): string {
  const trimmed = url?.trim() || "";
  if (!trimmed) return fallback;
  if (trimmed.startsWith("/branding/")) return trimmed;
  // Legacy uploads from previous product branding
  if (trimmed.includes("/uploads/")) return fallback;
  return trimmed;
}

function mergeSettings(
  row: {
    title: string | null;
    product: string | null;
    description: string | null;
    logoUrl: string | null;
    logoDarkUrl?: string | null;
    logoHeightPx?: number | null;
    faviconUrl: string | null;
    supportEmail?: string | null;
    activityFeedDisplayCount?: number | null;
    activityFeedSimulatedEnabled?: boolean | null;
  } | null,
): SiteSettingsData {
  if (!row) return DEFAULTS;

  return {
    title: row.title?.trim() || DEFAULTS.title,
    product: row.product?.trim() || DEFAULTS.product,
    description: row.description?.trim() || DEFAULTS.description,
    logoUrl: normalizeAssetUrl(row.logoUrl, DEFAULTS.logoUrl),
    logoDarkUrl: normalizeAssetUrl(row.logoDarkUrl, DEFAULTS.logoDarkUrl),
    logoHeightPx: Math.min(120, Math.max(24, row.logoHeightPx ?? DEFAULTS.logoHeightPx)),
    faviconUrl: normalizeAssetUrl(row.faviconUrl, DEFAULTS.faviconUrl),
    supportEmail: row.supportEmail?.trim() || DEFAULTS.supportEmail,
    activityFeedDisplayCount: Math.max(20, row.activityFeedDisplayCount ?? DEFAULTS.activityFeedDisplayCount),
    activityFeedSimulatedEnabled: row.activityFeedSimulatedEnabled ?? DEFAULTS.activityFeedSimulatedEnabled,
    ...STATIC_DEFAULTS,
  };
}

export async function getSiteSettings(): Promise<SiteSettingsData> {
  try {
    const siteSettings = (prisma as unknown as { siteSettings?: { findUnique: (args: unknown) => Promise<unknown> } })
      .siteSettings;
    if (!siteSettings?.findUnique) {
      return DEFAULTS;
    }

    const row = await siteSettings.findUnique({ where: { id: "default" } });
    return mergeSettings(row as Parameters<typeof mergeSettings>[0]);
  } catch {
    return DEFAULTS;
  }
}

function hasModelDelegate(client: typeof prisma, model: string) {
  const delegate = (client as unknown as Record<string, unknown>)[model];
  return Boolean(delegate && typeof (delegate as { findUnique?: unknown }).findUnique === "function");
}

export async function getDisplaySettings(): Promise<DisplaySettingsData> {
  const settings = await getSiteSettings();
  return {
    activityFeedDisplayCount: settings.activityFeedDisplayCount,
    activityFeedSimulatedEnabled: settings.activityFeedSimulatedEnabled,
  };
}

export async function updateSiteSettings(
  input: Partial<
    Pick<
      SiteSettingsData,
      | "title"
      | "product"
      | "description"
      | "logoUrl"
      | "logoDarkUrl"
      | "logoHeightPx"
      | "faviconUrl"
      | "supportEmail"
      | "activityFeedDisplayCount"
      | "activityFeedSimulatedEnabled"
    >
  >,
): Promise<SiteSettingsData> {
  if (!hasModelDelegate(prisma, "siteSettings")) {
    throw new Error("Database not ready. Restart the dev server, then run: npx prisma generate");
  }

  const current = await getSiteSettings();
  const next = {
    title: input.title?.trim() ?? current.title,
    product: input.product?.trim() ?? current.product,
    description: input.description?.trim() ?? current.description,
    logoUrl: input.logoUrl?.trim() ?? current.logoUrl,
    logoDarkUrl: input.logoDarkUrl?.trim() ?? current.logoDarkUrl,
    logoHeightPx: Math.min(120, Math.max(24, input.logoHeightPx ?? current.logoHeightPx)),
    faviconUrl: input.faviconUrl?.trim() ?? current.faviconUrl,
    supportEmail: input.supportEmail?.trim() ?? current.supportEmail,
    activityFeedDisplayCount: Math.max(
      20,
      input.activityFeedDisplayCount ?? current.activityFeedDisplayCount,
    ),
    activityFeedSimulatedEnabled:
      input.activityFeedSimulatedEnabled ?? current.activityFeedSimulatedEnabled,
  };

  const row = await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      title: next.title || null,
      product: next.product || null,
      description: next.description || null,
      logoUrl: next.logoUrl || null,
      logoDarkUrl: next.logoDarkUrl || null,
      logoHeightPx: next.logoHeightPx,
      faviconUrl: next.faviconUrl || null,
      supportEmail: next.supportEmail || null,
      activityFeedDisplayCount: next.activityFeedDisplayCount,
      activityFeedSimulatedEnabled: next.activityFeedSimulatedEnabled,
    },
    update: {
      title: next.title || null,
      product: next.product || null,
      description: next.description || null,
      logoUrl: next.logoUrl || null,
      logoDarkUrl: next.logoDarkUrl || null,
      logoHeightPx: next.logoHeightPx,
      faviconUrl: next.faviconUrl || null,
      supportEmail: next.supportEmail || null,
      activityFeedDisplayCount: next.activityFeedDisplayCount,
      activityFeedSimulatedEnabled: next.activityFeedSimulatedEnabled,
    },
  });

  return mergeSettings(row);
}

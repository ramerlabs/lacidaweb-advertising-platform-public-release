import { prisma } from "@/lib/prisma";
import { getAppOrigin } from "@/lib/publisher-embed";
import {
  PERSONAL_AUTO_ADS_KEY,
  WP_PLUGIN_AUTO_ADS_KEY,
} from "@/lib/domain-approval";
import { parseAdminEmails } from "@/lib/platform-admin";
import { randomBytes } from "crypto";

function newAutoAdsKey() {
  return randomBytes(12).toString("base64url");
}

export { PERSONAL_AUTO_ADS_KEY, WP_PLUGIN_AUTO_ADS_KEY };

const PLATFORM_TEAM_SLUG = "lacidaweb-platform";
const PERSONAL_SITE_DOMAIN = "personal.lacidaweb.internal";
const WP_PLUGIN_SITE_DOMAIN = "wp-plugin.lacidaweb.internal";

async function getOrCreatePlatformTeam() {
  const existing = await prisma.team.findUnique({ where: { slug: PLATFORM_TEAM_SLUG } });
  if (existing) return existing;

  const adminEmails = parseAdminEmails();
  const admin =
    (await prisma.user.findFirst({
      where: { email: { in: adminEmails } },
      orderBy: { createdAt: "asc" },
    })) ||
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!admin) {
    throw new Error("No platform user available to own personal ads site");
  }

  return prisma.team.create({
    data: {
      name: "lacidaweb Platform",
      slug: PLATFORM_TEAM_SLUG,
      members: {
        create: { userId: admin.id, role: "OWNER" },
      },
    },
  });
}

async function ensurePlatformKeyedSite(opts: {
  autoAdsKey: string;
  name: string;
  domain: string;
}) {
  const existing = await prisma.publisherSite.findUnique({
    where: { autoAdsKey: opts.autoAdsKey },
  });
  if (existing) {
    if (existing.status !== "ACTIVE" || !existing.autoAdsEnabled) {
      await prisma.publisherSite.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", autoAdsEnabled: true },
      });
    }
    await ensureAutoPlacements(existing.id);
    return prisma.publisherSite.findUniqueOrThrow({
      where: { id: existing.id },
      include: {
        placements: {
          where: { isActive: true, autoSlot: { not: null } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  const team = await getOrCreatePlatformTeam();
  const site = await prisma.publisherSite.create({
    data: {
      teamId: team.id,
      name: opts.name,
      domain: opts.domain,
      status: "ACTIVE",
      autoAdsEnabled: true,
      autoAdsKey: opts.autoAdsKey,
    },
  });
  await ensureAutoPlacements(site.id);
  return prisma.publisherSite.findUniqueOrThrow({
    where: { id: site.id },
    include: {
      placements: {
        where: { isActive: true, autoSlot: { not: null } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/** Platform-owned site used for allowlisted personal domains (not a publisher registration). */
export async function ensurePersonalAutoAdsSite() {
  return ensurePlatformKeyedSite({
    autoAdsKey: PERSONAL_AUTO_ADS_KEY,
    name: "Personal allowlist ads",
    domain: PERSONAL_SITE_DOMAIN,
  });
}

/** Platform-owned site for WordPress plugin installs on any customer domain. */
export async function ensureWpPluginAutoAdsSite() {
  return ensurePlatformKeyedSite({
    autoAdsKey: WP_PLUGIN_AUTO_ADS_KEY,
    name: "WordPress plugin network ads",
    domain: WP_PLUGIN_SITE_DOMAIN,
  });
}

export async function ensureSiteAutoAdsKey(siteId: string): Promise<string> {
  const site = await prisma.publisherSite.findUnique({ where: { id: siteId } });
  if (!site) throw new Error("Site not found");
  if (site.autoAdsKey) return site.autoAdsKey;

  let key = newAutoAdsKey();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const updated = await prisma.publisherSite.update({
        where: { id: siteId },
        data: { autoAdsKey: key },
      });
      return updated.autoAdsKey!;
    } catch {
      key = newAutoAdsKey();
    }
  }
  throw new Error("Failed to assign auto ads key");
}

export const AUTO_AD_SLOTS = [
  {
    autoSlot: "top",
    name: "Auto — top banner",
    format: "BANNER" as const,
    width: 728,
    height: 90,
  },
  {
    autoSlot: "infeed",
    name: "Auto — in-article",
    format: "TEXT_BOX" as const,
    width: 300,
    height: 0,
  },
  {
    autoSlot: "mid",
    name: "Auto — lower article",
    format: "BANNER" as const,
    width: 300,
    height: 250,
  },
  {
    autoSlot: "anchor",
    name: "Auto — end of content",
    format: "TEXT_INLINE" as const,
    width: 0,
    height: 0,
  },
];

/** Max auto-ad units injected on a publisher page. */
export const MAX_AUTO_ADS_PER_PAGE = 4;

export function buildAutoEmbedSnippet(autoAdsKey: string, origin?: string) {
  const base = getAppOrigin(origin);
  return `<!-- lacidaweb automatic ads (like Google Auto ads) -->
<script async src="${base}/embed.js" data-site="${autoAdsKey}"></script>`;
}

export async function ensureAutoPlacements(siteId: string) {
  const site = await prisma.publisherSite.findUnique({
    where: { id: siteId },
    include: { placements: true },
  });
  if (!site) return [];

  const existing = new Set(
    site.placements.filter((p) => p.autoSlot).map((p) => p.autoSlot as string),
  );

  for (const slot of AUTO_AD_SLOTS) {
    if (existing.has(slot.autoSlot)) continue;
    await prisma.adPlacement.create({
      data: {
        siteId: site.id,
        name: slot.name,
        format: slot.format,
        width: slot.width,
        height: slot.height,
        autoSlot: slot.autoSlot,
      },
    });
  }

  // Deactivate duplicate autoSlot rows (keep oldest active).
  const autos = await prisma.adPlacement.findMany({
    where: { siteId, autoSlot: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  const seen = new Set<string>();
  const deactivateIds: string[] = [];
  for (const p of autos) {
    const key = p.autoSlot as string;
    if (seen.has(key)) {
      if (p.isActive) deactivateIds.push(p.id);
    } else {
      seen.add(key);
    }
  }
  if (deactivateIds.length) {
    await prisma.adPlacement.updateMany({
      where: { id: { in: deactivateIds } },
      data: { isActive: false },
    });
  }

  return prisma.adPlacement.findMany({
    where: { siteId, autoSlot: { not: null }, isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

function configFromSite(
  site: {
    id: string;
    domain: string;
    autoAdsEnabled: boolean;
  },
  placements: Array<{
    autoSlot: string | null;
    placementKey: string;
    format: string;
    width: number;
    height: number;
  }>,
  isPersonal = false,
  isOpenNetwork = false,
) {
  const bySlot = new Map<string, (typeof placements)[number]>();
  for (const p of placements) {
    const key = p.autoSlot || p.placementKey;
    if (!bySlot.has(key)) bySlot.set(key, p);
  }
  const unique = Array.from(bySlot.values()).slice(0, MAX_AUTO_ADS_PER_PAGE);

  return {
    siteId: site.id,
    domain: site.domain,
    autoAdsEnabled: site.autoAdsEnabled,
    maxAds: MAX_AUTO_ADS_PER_PAGE,
    isPersonal,
    isOpenNetwork,
    slots: unique.map((p) => ({
      autoSlot: p.autoSlot,
      placementKey: p.placementKey,
      format: p.format,
      width: p.width,
      height: p.height,
    })),
  };
}

export async function getAutoAdsConfig(autoAdsKey: string) {
  if (autoAdsKey === PERSONAL_AUTO_ADS_KEY) {
    const site = await ensurePersonalAutoAdsSite();
    const placements = await ensureAutoPlacements(site.id);
    return configFromSite(site, placements, true);
  }

  if (autoAdsKey === WP_PLUGIN_AUTO_ADS_KEY) {
    const site = await ensureWpPluginAutoAdsSite();
    const placements = await ensureAutoPlacements(site.id);
    return configFromSite(site, placements, false, true);
  }

  const site = await prisma.publisherSite.findUnique({
    where: { autoAdsKey },
    include: {
      placements: {
        where: { isActive: true, autoSlot: { not: null } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!site || site.status !== "ACTIVE") {
    return null;
  }

  const placements = await ensureAutoPlacements(site.id);
  return configFromSite(site, placements, false, false);
}

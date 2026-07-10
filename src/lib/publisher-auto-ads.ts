import { prisma } from "@/lib/prisma";
import { getAppOrigin } from "@/lib/publisher-embed";
import { randomBytes } from "crypto";

function newAutoAdsKey() {
  return randomBytes(12).toString("base64url");
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

export async function getAutoAdsConfig(autoAdsKey: string) {
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

  // Ensure defaults exist and deactivate duplicate autoSlot rows.
  const placements = await ensureAutoPlacements(site.id);

  // One placement per autoSlot (safety net).
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
    slots: unique.map((p) => ({
      autoSlot: p.autoSlot,
      placementKey: p.placementKey,
      format: p.format,
      width: p.width,
      height: p.height,
    })),
  };
}

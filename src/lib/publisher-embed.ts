import { brand } from "@/lib/brand";

export function getAppOrigin(fallback?: string) {
  if (fallback) return fallback.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return brand.url.replace(/\/$/, "");
}

export function buildEmbedSnippet(placementKey: string, origin?: string) {
  const base = getAppOrigin(origin);
  const targetId = `lacidaweb-ad-${placementKey}`;

  return `<!-- lacidaweb publisher ad -->
<div id="${targetId}"></div>
<script async src="${base}/embed.js" data-placement="${placementKey}" data-target="${targetId}"></script>`;
}

export {
  PLACEMENT_PRESETS,
  PUBLISHER_AD_TEMPLATES,
  getAdTemplate,
  DISPLAY_TEMPLATES,
  TEXT_TEMPLATES,
} from "@/lib/publisher-ad-templates";

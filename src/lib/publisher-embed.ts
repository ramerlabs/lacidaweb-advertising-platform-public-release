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

/** WordPress PHP for a specific placement (chosen ad type). */
export function buildWpPlacementPhpSnippet(placementKey: string, origin?: string) {
  const base = getAppOrigin(origin);
  const targetId = `lacidaweb-ad-${placementKey}`;
  return `<?php
// lacidaweb — specific ad unit (paste where you want this ad type to appear)
add_action('wp_footer', function () {
  if (is_admin()) {
    return;
  }
  echo '<div id="${targetId}"></div>';
  echo '<script async src="${base}/embed.js" data-placement="${placementKey}" data-target="${targetId}"></script>';
}, 99);`;
}

export {
  PLACEMENT_PRESETS,
  PUBLISHER_AD_TEMPLATES,
  getAdTemplate,
  DISPLAY_TEMPLATES,
  TEXT_TEMPLATES,
} from "@/lib/publisher-ad-templates";

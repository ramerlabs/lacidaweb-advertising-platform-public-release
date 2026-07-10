/** Fixed auto-ads key for personal / allowlisted domains (not a publisher site). */
export const PERSONAL_AUTO_ADS_KEY = "lw-personal";

/**
 * Shared key for WordPress (or other) plugins shipped to random customer domains.
 * Works on any host — no allowlist / registration required.
 */
export const WP_PLUGIN_AUTO_ADS_KEY = "lw-wp-plugin";

export function isOpenNetworkKey(key: string | null | undefined): boolean {
  return key === WP_PLUGIN_AUTO_ADS_KEY;
}

export function isPersonalAllowlistKey(key: string | null | undefined): boolean {
  return key === PERSONAL_AUTO_ADS_KEY;
}

/** Strip protocol, path, port, www — lowercase host. */
export function normalizeHost(input: string | null | undefined): string {
  if (!input) return "";
  let value = String(input).trim().toLowerCase();
  if (!value) return "";
  try {
    if (value.includes("://")) {
      value = new URL(value).hostname;
    } else {
      value = value.split("/")[0] || "";
      value = value.split("?")[0] || "";
      value = value.split("#")[0] || "";
    }
  } catch {
    value = value.replace(/^https?:\/\//, "").split("/")[0] || "";
  }
  value = value.replace(/:\d+$/, "");
  if (value.startsWith("www.")) value = value.slice(4);
  return value;
}

export function parseAllowedDomains(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(/[\n,]+/)) {
    const host = normalizeHost(part);
    if (host) seen.add(host);
  }
  return [...seen];
}

export function formatAllowedDomains(hosts: string[]): string {
  return hosts.map((h) => normalizeHost(h)).filter(Boolean).join("\n");
}

/** Prefer Origin, then Referer. */
export function requestHostFromHeaders(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (origin) {
    const host = normalizeHost(origin);
    if (host) return host;
  }
  const referer = req.headers.get("referer") || req.headers.get("referrer");
  if (referer) {
    const host = normalizeHost(referer);
    if (host) return host;
  }
  return null;
}

export function isHostAllowlisted(
  host: string | null | undefined,
  allowedRaw: string | null | undefined,
): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  return parseAllowedDomains(allowedRaw).includes(normalized);
}

export function domainMatchesSite(
  host: string | null | undefined,
  siteDomain: string | null | undefined,
): boolean {
  const a = normalizeHost(host);
  const b = normalizeHost(siteDomain);
  if (!a || !b) return false;
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

/**
 * Decide whether ads may serve for this request host.
 * - Open network / WP plugin key: always allow (any install domain).
 * - Personal key: only allowlisted hosts.
 * - Approval off: always allow (any valid key).
 * - Approval on: allowlist OR registered site domain match.
 */
export function canServeOnHost(opts: {
  requireDomainApproval: boolean;
  allowedAdDomains: string;
  requestHost: string | null;
  siteDomain?: string | null;
  isPersonalKey?: boolean;
  isOpenNetworkKey?: boolean;
}): boolean {
  if (opts.isOpenNetworkKey) return true;
  if (opts.isPersonalKey) {
    return isHostAllowlisted(opts.requestHost, opts.allowedAdDomains);
  }
  if (!opts.requireDomainApproval) return true;
  if (isHostAllowlisted(opts.requestHost, opts.allowedAdDomains)) return true;
  if (opts.siteDomain && domainMatchesSite(opts.requestHost, opts.siteDomain)) return true;
  return false;
}

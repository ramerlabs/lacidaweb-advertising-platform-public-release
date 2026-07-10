/**
 * RamerLabs License Client for lacidaweb (SaaS / Node).
 * Validates against License Manager public API. Server URL stays private —
 * client UI only asks for the license key.
 */

import { prisma } from "@/lib/prisma";

export const LACIDAWEB_PRODUCT_SLUG =
  process.env.RLM_PRODUCT_SLUG?.trim() || "lacidaweb-advertising-platform";

/** Internal only — never expose this URL in client-facing UI or error messages. */
function licenseServerUrl(): string {
  return (process.env.RLM_LICENSE_SERVER || "https://ramerlabs.com").replace(/\/$/, "");
}

export type LicenseStatus = {
  active: boolean;
  licenseKeyMasked: string;
  status: string | null;
  expiresAt: string | null;
  message: string | null;
  lastValidatedAt: string | null;
};

function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 8) return "••••••••";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

async function getStoredLicense(): Promise<{
  licenseKey: string;
  status: string | null;
  expiresAt: string | null;
  lastValidatedAt: Date | null;
  payload: unknown;
} | null> {
  try {
    const row = await prisma.platformLicense.findUnique({ where: { id: "default" } });
    if (!row?.licenseKey) return null;
    return row;
  } catch {
    return null;
  }
}

async function upsertLicense(data: {
  licenseKey: string;
  status: string;
  expiresAt?: string | null;
  payload?: unknown;
}) {
  await prisma.platformLicense.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      licenseKey: data.licenseKey,
      productSlug: LACIDAWEB_PRODUCT_SLUG,
      status: data.status,
      expiresAt: data.expiresAt || null,
      lastValidatedAt: new Date(),
      payload: data.payload as object | undefined,
    },
    update: {
      licenseKey: data.licenseKey,
      productSlug: LACIDAWEB_PRODUCT_SLUG,
      status: data.status,
      expiresAt: data.expiresAt || null,
      lastValidatedAt: new Date(),
      payload: data.payload as object | undefined,
    },
  });
}

type RlmResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  data?: {
    license_key?: string;
    status?: string;
    expires_at?: string | null;
    product?: string;
    product_slug?: string;
  };
};

async function callLicenseApi(
  path: "activate" | "validate" | "deactivate",
  body: Record<string, string>,
): Promise<RlmResponse> {
  const res = await fetch(`${licenseServerUrl()}/wp-json/ramerlabs-license/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as RlmResponse;
  if (!res.ok) {
    return {
      success: false,
      message: json.message || `License request failed (${res.status})`,
      code: json.code || "http_error",
    };
  }
  return json;
}

function siteIdentity() {
  const url = (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return {
    site_url: url,
    site_name: "lacidaweb",
  };
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
  const envKey = process.env.LACIDAWEB_LICENSE_KEY?.trim() || "";
  const stored = await getStoredLicense();
  const key = stored?.licenseKey || envKey;

  if (!key) {
    return {
      active: false,
      licenseKeyMasked: "",
      status: null,
      expiresAt: null,
      message: "No license key activated yet",
      lastValidatedAt: null,
    };
  }

  const status = stored?.status || (envKey ? "unknown" : null);
  const active = status === "active" || status === "valid";

  return {
    active,
    licenseKeyMasked: maskKey(key),
    status,
    expiresAt: stored?.expiresAt || null,
    message: active ? "License active" : "License needs activation",
    lastValidatedAt: stored?.lastValidatedAt?.toISOString() || null,
  };
}

export async function activateLicense(licenseKey: string): Promise<LicenseStatus> {
  const key = licenseKey.trim();
  if (!key) throw new Error("License key is required");

  const identity = siteIdentity();
  const response = await callLicenseApi("activate", {
    license_key: key,
    product_slug: LACIDAWEB_PRODUCT_SLUG,
    site_url: identity.site_url,
    site_name: identity.site_name,
  });

  if (!response.success) {
    throw new Error(response.message || "License activation failed");
  }

  await upsertLicense({
    licenseKey: key,
    status: response.data?.status || "active",
    expiresAt: response.data?.expires_at ?? null,
    payload: response.data,
  });

  return getLicenseStatus();
}

export async function validateLicense(force = false): Promise<LicenseStatus> {
  const stored = await getStoredLicense();
  const envKey = process.env.LACIDAWEB_LICENSE_KEY?.trim() || "";
  const key = stored?.licenseKey || envKey;
  if (!key) return getLicenseStatus();

  if (
    !force &&
    stored?.lastValidatedAt &&
    Date.now() - stored.lastValidatedAt.getTime() < 12 * 60 * 60 * 1000 &&
    (stored.status === "active" || stored.status === "valid")
  ) {
    return getLicenseStatus();
  }

  const identity = siteIdentity();
  const response = await callLicenseApi("validate", {
    license_key: key,
    product_slug: LACIDAWEB_PRODUCT_SLUG,
    site_url: identity.site_url,
  });

  if (!response.success) {
    if (stored) {
      await upsertLicense({
        licenseKey: key,
        status: "invalid",
        expiresAt: stored.expiresAt,
        payload: { code: response.code, message: response.message },
      });
    }
    return {
      ...(await getLicenseStatus()),
      active: false,
      message: response.message || "License validation failed",
    };
  }

  await upsertLicense({
    licenseKey: key,
    status: response.data?.status || "active",
    expiresAt: response.data?.expires_at ?? null,
    payload: response.data,
  });

  return getLicenseStatus();
}

export async function deactivateLicense(): Promise<LicenseStatus> {
  const stored = await getStoredLicense();
  if (!stored?.licenseKey) return getLicenseStatus();

  const identity = siteIdentity();
  await callLicenseApi("deactivate", {
    license_key: stored.licenseKey,
    product_slug: LACIDAWEB_PRODUCT_SLUG,
    site_url: identity.site_url,
  }).catch(() => null);

  await prisma.platformLicense.delete({ where: { id: "default" } }).catch(() => null);
  return getLicenseStatus();
}

export async function requireActiveLicense(): Promise<void> {
  if (process.env.NODE_ENV === "development" && process.env.SKIP_LICENSE_CHECK === "1") {
    return;
  }
  const status = await validateLicense(false);
  if (!status.active) {
    throw new Error("LICENSE_REQUIRED");
  }
}

/** Soft check for layouts (no remote re-validate every request). */
export async function isPlatformLicensed(): Promise<boolean> {
  if (process.env.NODE_ENV === "development" && process.env.SKIP_LICENSE_CHECK === "1") {
    return true;
  }
  const status = await getLicenseStatus();
  if (status.active) return true;
  // Env key present but not activated yet — try one validate
  if (process.env.LACIDAWEB_LICENSE_KEY?.trim()) {
    const validated = await validateLicense(true);
    return validated.active;
  }
  return false;
}

export function licenseErrorResponse(message = "LICENSE_REQUIRED") {
  return {
    error: message,
    code: "LICENSE_REQUIRED",
    message:
      "This lacidaweb deployment is not licensed. An admin must activate a license key first.",
  };
}

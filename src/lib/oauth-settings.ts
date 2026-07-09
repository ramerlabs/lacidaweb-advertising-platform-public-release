import { prisma } from "@/lib/prisma";

export type OAuthProviderId = "google" | "facebook";

export type OAuthSettings = {
  googleEnabled: boolean;
  facebookEnabled: boolean;
  googleConfigured: boolean;
  facebookConfigured: boolean;
};

const DEFAULTS: OAuthSettings = {
  googleEnabled: true,
  facebookEnabled: true,
  googleConfigured: Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  ),
  facebookConfigured: Boolean(
    process.env.FACEBOOK_CLIENT_ID?.trim() && process.env.FACEBOOK_CLIENT_SECRET?.trim(),
  ),
};

export async function getOAuthSettings(): Promise<OAuthSettings> {
  try {
    const row = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
    return {
      googleEnabled: row?.googleOAuthEnabled ?? DEFAULTS.googleEnabled,
      facebookEnabled: row?.facebookOAuthEnabled ?? DEFAULTS.facebookEnabled,
      googleConfigured: DEFAULTS.googleConfigured,
      facebookConfigured: DEFAULTS.facebookConfigured,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function getPublicOAuthProviders(): Promise<OAuthProviderId[]> {
  const settings = await getOAuthSettings();
  const providers: OAuthProviderId[] = [];
  if (settings.googleConfigured && settings.googleEnabled) providers.push("google");
  if (settings.facebookConfigured && settings.facebookEnabled) providers.push("facebook");
  return providers;
}

export async function isOAuthProviderAllowed(provider: string): Promise<boolean> {
  const settings = await getOAuthSettings();
  if (provider === "google") return settings.googleConfigured && settings.googleEnabled;
  if (provider === "facebook") return settings.facebookConfigured && settings.facebookEnabled;
  return false;
}

import { prisma } from "@/lib/prisma";

export type OAuthProviderId = "google";

export type OAuthSettings = {
  googleEnabled: boolean;
  googleConfigured: boolean;
};

const DEFAULTS: OAuthSettings = {
  googleEnabled: true,
  googleConfigured: Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  ),
};

export async function getOAuthSettings(): Promise<OAuthSettings> {
  try {
    const row = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
    return {
      googleEnabled: row?.googleOAuthEnabled ?? DEFAULTS.googleEnabled,
      googleConfigured: DEFAULTS.googleConfigured,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function getPublicOAuthProviders(): Promise<OAuthProviderId[]> {
  const settings = await getOAuthSettings();
  const providers: OAuthProviderId[] = [];
  if (settings.googleConfigured && settings.googleEnabled) providers.push("google");
  return providers;
}

export async function isOAuthProviderAllowed(provider: string): Promise<boolean> {
  const settings = await getOAuthSettings();
  if (provider === "google") return settings.googleConfigured && settings.googleEnabled;
  return false;
}

/** Landing hero impressions / clicks (real AdEvents + optional synthetic growth). */

export type LandingFakeStatsConfig = {
  enabled: boolean;
  impressionsBase: number;
  clicksBase: number;
  impressionsPerHour: number;
  clicksPerHour: number;
  startedAt: Date;
};

export const LANDING_FAKE_STATS_DEFAULTS: LandingFakeStatsConfig = {
  enabled: true,
  impressionsBase: 18_420,
  clicksBase: 612,
  impressionsPerHour: 180,
  clicksPerHour: 7.2,
  startedAt: new Date("2026-07-01T00:00:00.000Z"),
};

export function computeFakeGrowth(
  config: LandingFakeStatsConfig,
  at: Date = new Date(),
): { impressions: number; clicks: number } {
  if (!config.enabled) {
    return { impressions: 0, clicks: 0 };
  }
  const elapsedMs = Math.max(0, at.getTime() - config.startedAt.getTime());
  const hours = elapsedMs / 3_600_000;
  return {
    impressions: Math.floor(config.impressionsBase + hours * config.impressionsPerHour),
    clicks: Math.floor(config.clicksBase + hours * config.clicksPerHour),
  };
}

export function displayLandingAdStats(
  real: { impressions: number; clicks: number },
  config: LandingFakeStatsConfig,
  at: Date = new Date(),
) {
  const fake = computeFakeGrowth(config, at);
  return {
    impressions: fake.impressions + Math.max(0, real.impressions),
    clicks: fake.clicks + Math.max(0, real.clicks),
    fakeEnabled: config.enabled,
    impressionsPerHour: config.enabled ? config.impressionsPerHour : 0,
    clicksPerHour: config.enabled ? config.clicksPerHour : 0,
  };
}

export function formatStatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  return Math.floor(n).toLocaleString("en-US");
}

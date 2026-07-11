/** Client pays platformBudget / (1 - margin). At 32% platform share, $10 ad budget → ~$14.71 client charge. */
export function clientChargeFromPlatformBudget(platformBudgetUsd: number, marginPercent: number): number {
  if (platformBudgetUsd <= 0) return 0;
  const margin = Math.min(Math.max(marginPercent, 0), 99) / 100;
  if (margin >= 1) return platformBudgetUsd;
  return Math.round((platformBudgetUsd / (1 - margin)) * 100) / 100;
}

export function platformBudgetFromClientCharge(clientChargeUsd: number, marginPercent: number): number {
  if (clientChargeUsd <= 0) return 0;
  const margin = Math.min(Math.max(marginPercent, 0), 99) / 100;
  return Math.round(clientChargeUsd * (1 - margin) * 100) / 100;
}

export function formatAdPricing(platformBudgetUsd: number, marginPercent: number) {
  const clientCharge = clientChargeFromPlatformBudget(platformBudgetUsd, marginPercent);
  const fee = Math.round((clientCharge - platformBudgetUsd) * 100) / 100;
  return { platformBudgetUsd, clientChargeUsd: clientCharge, platformFeeUsd: fee, marginPercent };
}

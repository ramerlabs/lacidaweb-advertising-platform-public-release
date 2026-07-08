export function usdToCents(usd: number): number {
  return Math.round(usd * 100);
}

export function centsToUsd(cents: number): number {
  return cents / 100;
}

export function formatAdWalletUsd(cents: number): string {
  return centsToUsd(cents).toFixed(2);
}

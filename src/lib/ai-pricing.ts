export function applyProfitMargin(providerCostUsd: number, marginPercent: number): number {
  const margin = Math.min(99, Math.max(0, marginPercent)) / 100;
  if (margin >= 1) return providerCostUsd;
  return providerCostUsd / (1 - margin);
}

export function usdToCents(usd: number): number {
  return Math.max(1, Math.ceil(usd * 100));
}

export function centsToUsd(cents: number): string {
  return (cents / 100).toFixed(2);
}

export type AiPricingConfig = {
  profitMarginPercent: number;
  textInputCostPerMillion: number;
  textOutputCostPerMillion: number;
  imageCostUsd: number;
  creditPackUsd: number;
  creditsPerPackCents: number;
};

export type AiClientPricing = {
  profitMarginPercent: number;
  textInputPerMillionUsd: number;
  textOutputPerMillionUsd: number;
  imageUsd: number;
  creditPackUsd: number;
  creditsPerPackCents: number;
  estimatedTextPostUsd: number;
  estimatedImageUsd: number;
};

export function getClientPricing(config: AiPricingConfig): AiClientPricing {
  const margin = config.profitMarginPercent;
  const textInputPerMillionUsd = applyProfitMargin(config.textInputCostPerMillion, margin);
  const textOutputPerMillionUsd = applyProfitMargin(config.textOutputCostPerMillion, margin);
  const imageUsd = applyProfitMargin(config.imageCostUsd, margin);
  const estimatedTextPostUsd = applyProfitMargin(
    (500 * config.textInputCostPerMillion) / 1_000_000 +
      (300 * config.textOutputCostPerMillion) / 1_000_000,
    margin,
  );

  return {
    profitMarginPercent: margin,
    textInputPerMillionUsd,
    textOutputPerMillionUsd,
    imageUsd,
    creditPackUsd: config.creditPackUsd,
    creditsPerPackCents: config.creditsPerPackCents,
    estimatedTextPostUsd,
    estimatedImageUsd: imageUsd,
  };
}

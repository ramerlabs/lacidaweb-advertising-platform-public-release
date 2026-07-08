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

/** Tokens granted when client pays for a pack (priced at client input-token rate). */
export function packUsdToTokens(packUsd: number, clientInputPerMillionUsd: number): number {
  if (clientInputPerMillionUsd <= 0) return 0;
  return Math.floor((packUsd / clientInputPerMillionUsd) * 1_000_000);
}

/** Image generation cost expressed in tokens at the input-token rate. */
export function imageCostInTokens(imageUsd: number, clientInputPerMillionUsd: number): number {
  if (clientInputPerMillionUsd <= 0) return 0;
  return Math.max(1, Math.ceil((imageUsd / clientInputPerMillionUsd) * 1_000_000));
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toLocaleString();
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
  tokensPerPack: number;
  estimatedTextPostUsd: number;
  estimatedImageUsd: number;
  estimatedTextPostTokens: number;
  imageTokenCost: number;
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
  const tokensPerPack = packUsdToTokens(config.creditPackUsd, textInputPerMillionUsd);
  const imageTokenCost = imageCostInTokens(imageUsd, textInputPerMillionUsd);

  return {
    profitMarginPercent: margin,
    textInputPerMillionUsd,
    textOutputPerMillionUsd,
    imageUsd,
    creditPackUsd: config.creditPackUsd,
    tokensPerPack,
    estimatedTextPostUsd,
    estimatedImageUsd: imageUsd,
    estimatedTextPostTokens: 800,
    imageTokenCost,
  };
}

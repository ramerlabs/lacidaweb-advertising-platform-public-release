/**
 * Two-step fee & revenue share on advertiser gross spend:
 * 1. Platform buy-side fee: 15% of gross → Net Auction Revenue = Gross × 0.85
 * 2. Publisher share: 80% of net → Publisher Payout = Net × 0.80
 *
 * Guardrail: publisher receives 68% of gross; platform retains 32% of gross.
 */

export const BUY_SIDE_FEE_PERCENT = 15;
export const PUBLISHER_SHARE_OF_NET_PERCENT = 80;
export const PUBLISHER_SHARE_OF_GROSS_PERCENT = 68;
export const PLATFORM_SHARE_OF_GROSS_PERCENT = 32;

const BUY_SIDE_FEE_RATE = BUY_SIDE_FEE_PERCENT / 100;
const PUBLISHER_OF_NET_RATE = PUBLISHER_SHARE_OF_NET_PERCENT / 100;
const PUBLISHER_OF_GROSS_RATE = PUBLISHER_SHARE_OF_GROSS_PERCENT / 100;

export type RevenueShareSplit = {
  grossCents: number;
  /** Step 1: 15% platform management fee on gross */
  buySideFeeCents: number;
  /** Gross − buy-side fee */
  netAuctionCents: number;
  /** Step 2: 80% of net (= 68% of gross) */
  publisherPayoutCents: number;
  /** Remainder kept by platform (= 32% of gross) */
  platformRetainCents: number;
};

/** Apply the two-step deduction model to an advertiser gross charge (cents). */
export function splitAdvertiserGrossCharge(grossCents: number): RevenueShareSplit {
  const gross = Math.max(0, Math.floor(grossCents));
  if (gross <= 0) {
    return {
      grossCents: 0,
      buySideFeeCents: 0,
      netAuctionCents: 0,
      publisherPayoutCents: 0,
      platformRetainCents: 0,
    };
  }

  const buySideFeeCents = Math.round(gross * BUY_SIDE_FEE_RATE);
  const netAuctionCents = Math.max(0, gross - buySideFeeCents);
  // Guardrail: publisher = 68% of gross (equivalent to 80% of the 85% net).
  const publisherPayoutCents = Math.min(
    netAuctionCents,
    Math.max(0, Math.round(gross * PUBLISHER_OF_GROSS_RATE)),
  );
  const platformRetainCents = Math.max(0, gross - publisherPayoutCents);

  return {
    grossCents: gross,
    buySideFeeCents,
    netAuctionCents,
    publisherPayoutCents,
    platformRetainCents,
  };
}

export function publisherPayoutFromGross(grossCents: number): number {
  return splitAdvertiserGrossCharge(grossCents).publisherPayoutCents;
}

/** Expected publisher earn rate when admin configures advertiser gross CPM/CPC. */
export function publisherRateFromAdvertiserGross(advertiserGrossCents: number): number {
  return publisherPayoutFromGross(advertiserGrossCents);
}

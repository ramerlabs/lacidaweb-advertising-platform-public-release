/**
 * lacidaweb domain types — shared across API routes, services, and UI.
 * Mirrors Prisma enums/models in prisma/schema.prisma (advertising domain).
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

export type CampaignObjective = "AWARENESS" | "TRAFFIC" | "CONVERSIONS";

export type CampaignLifecycleStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "ARCHIVED";

export type AdCreativeStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "PAUSED";

export type BudgetType = "DAILY" | "LIFETIME";

/** Advertiser creative format — maps to publisher placement types when served. */
export type AdvertiserCreativeFormat = "IMAGE" | "TEXT_BOX" | "TEXT_INLINE" | "VIDEO";

export type PaymentMethod = "USDT" | "PAYPAL" | "GCASH" | "US_BANK";

export type WalletTransactionType = "TOP_UP" | "AD_SPEND" | "REFUND" | "ADJUSTMENT";

export type WalletTransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

export type CampaignReviewAction = "SUBMITTED" | "APPROVED" | "REJECTED" | "REQUESTED_CHANGES";

// ─── Audience targeting (stored as JSON on AdCampaign.targeting) ─────────────

export interface AudienceDemographics {
  ageMin?: number;
  ageMax?: number;
  genders?: ("male" | "female" | "all")[];
}

export interface AudienceLocation {
  countries: string[];
  regions?: string[];
  cities?: string[];
  radiusKm?: number;
  latitude?: number;
  longitude?: number;
}

export interface AudienceTargeting {
  demographics?: AudienceDemographics;
  location: AudienceLocation;
  interests?: string[];
  keywords?: string[];
  customAudiences?: string[];
  excludeAudiences?: string[];
}

// ─── Campaign wizard payload (Zod-validated at API boundary) ─────────────────

export interface CampaignWizardStep1 {
  objective: CampaignObjective;
  name: string;
}

export interface CampaignWizardStep2 {
  targeting: AudienceTargeting;
}

export interface CampaignWizardStep3 {
  budgetType: BudgetType;
  budgetAmountUsd: number;
  scheduleStart?: string;
  scheduleEnd?: string;
}

export interface AdCreativeInput {
  name: string;
  format: AdvertiserCreativeFormat;
  headline: string;
  primaryText: string;
  destinationUrl: string;
  ctaLabel?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface CampaignWizardStep4 {
  ads: AdCreativeInput[];
}

export interface CreateCampaignPayload
  extends CampaignWizardStep1,
    CampaignWizardStep2,
    CampaignWizardStep3,
    CampaignWizardStep4 {
  platform: string;
  connectedAccountId?: string;
  adAccountId: string;
}

// ─── Entity DTOs (API responses) ─────────────────────────────────────────────

export interface LacidawebUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
}

export interface LacidawebAdvertiser {
  id: string;
  name: string;
  slug: string;
  adWalletBalanceCents: number;
  businessName: string | null;
}

export interface CampaignDto {
  id: string;
  teamId: string;
  name: string;
  objective: CampaignObjective | null;
  goal: string;
  status: string;
  lifecycleStatus: CampaignLifecycleStatus;
  platform: string;
  adAccountId: string;
  budgetAmount: number;
  budgetType: string;
  budgetTypeEnum: BudgetType | null;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  targeting: AudienceTargeting | null;
  lifetimeSpendCents: number;
  paymentStatus: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  ads: AdDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AdDto {
  id: string;
  campaignId: string;
  name: string;
  status: AdCreativeStatus;
  format: AdvertiserCreativeFormat;
  headline: string;
  primaryText: string;
  destinationUrl: string;
  ctaLabel: string;
  imageUrl: string | null;
  videoUrl: string | null;
  sortOrder: number;
}

export interface WalletTransactionDto {
  id: string;
  teamId: string;
  campaignId: string | null;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amountCents: number;
  balanceAfterCents: number | null;
  currency: string;
  method: PaymentMethod | null;
  description: string | null;
  externalRef: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AnalyticsSnapshotDto {
  id: string;
  campaignId: string;
  snapshotDate: string;
  impressions: number;
  clicks: number;
  spendCents: number;
  conversions: number;
  reach: number;
  ctr: number;
  cpcCents: number;
  cpmCents: number;
}

export interface CampaignAnalyticsSummary {
  campaignId: string;
  impressions: number;
  clicks: number;
  spendCents: number;
  conversions: number;
  ctr: number;
  snapshots: AnalyticsSnapshotDto[];
}

export interface CampaignReviewDto {
  id: string;
  campaignId: string;
  reviewerId: string | null;
  action: CampaignReviewAction;
  notes: string | null;
  createdAt: string;
}

// ─── Admin platform metrics ──────────────────────────────────────────────────

export interface PlatformMetrics {
  totalUsers: number;
  activeAdvertisers: number;
  totalCampaigns: number;
  pendingReviewCount: number;
  activeCampaigns: number;
  totalSpendCents: number;
  totalWalletBalanceCents: number;
  transactionsToday: number;
}

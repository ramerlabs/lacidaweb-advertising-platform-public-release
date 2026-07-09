import type { CampaignObjective, AdvertiserCreativeFormat } from "@/types/lacidaweb";

export const CAMPAIGN_OBJECTIVES: {
  id: CampaignObjective;
  label: string;
  description: string;
}[] = [
  {
    id: "AWARENESS",
    label: "Awareness",
    description: "Maximize reach and brand visibility among your target audience.",
  },
  {
    id: "TRAFFIC",
    label: "Traffic",
    description: "Send people to your website, landing page, or app.",
  },
  {
    id: "CONVERSIONS",
    label: "Conversions",
    description: "Drive sign-ups, purchases, leads, and other valuable actions.",
  },
];

export const CTA_OPTIONS = [
  "Learn More",
  "Shop Now",
  "Sign Up",
  "Download",
  "Contact Us",
  "Get Offer",
  "Book Now",
] as const;

export const COUNTRY_OPTIONS = [
  { code: "US", label: "United States" },
  { code: "PH", label: "Philippines" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "SG", label: "Singapore" },
  { code: "IN", label: "India" },
  { code: "AE", label: "United Arab Emirates" },
] as const;

export const INTEREST_SUGGESTIONS = [
  "E-commerce",
  "Small business",
  "Digital marketing",
  "Technology",
  "Fashion",
  "Health & wellness",
  "Finance",
  "Real estate",
  "Food & dining",
  "Travel",
] as const;

export const WIZARD_STEPS = [
  { step: 1, label: "Objective" },
  { step: 2, label: "Audience" },
  { step: 3, label: "Budget" },
  { step: 4, label: "Creative" },
] as const;

export const ADVERTISER_AD_FORMATS: {
  id: AdvertiserCreativeFormat;
  label: string;
  description: string;
}[] = [
  {
    id: "IMAGE",
    label: "Image ad",
    description: "Display banner or card with an uploaded image, headline, and CTA.",
  },
  {
    id: "TEXT_BOX",
    label: "Text box ad",
    description: "Bordered text unit with headline, description, and button — no image required.",
  },
  {
    id: "TEXT_INLINE",
    label: "In-line text ad",
    description: "Short sponsored link line that fits between paragraphs on publisher sites.",
  },
  {
    id: "VIDEO",
    label: "Video ad",
    description: "Video URL with headline and supporting copy.",
  },
];

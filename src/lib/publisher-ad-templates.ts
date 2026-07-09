export type AdTemplateCategory = "display" | "text";

export type PublisherAdTemplate = {
  id: string;
  name: string;
  description: string;
  category: AdTemplateCategory;
  format: string;
  width: number;
  height: number;
  sample: {
    headline: string;
    primaryText: string;
    ctaLabel: string;
    imageUrl?: string;
  };
};

export const SAMPLE_AD = {
  headline: "Grow your business with lacidaweb",
  primaryText: "Reach customers with self-serve ads. Launch campaigns in minutes.",
  ctaLabel: "Learn more",
  imageUrl: undefined as string | undefined,
};

export const PUBLISHER_AD_TEMPLATES: PublisherAdTemplate[] = [
  {
    id: "banner",
    name: "Standard banner",
    description: "728×90 display banner — header or footer placement",
    category: "display",
    format: "BANNER",
    width: 728,
    height: 90,
    sample: SAMPLE_AD,
  },
  {
    id: "leaderboard",
    name: "Leaderboard",
    description: "970×90 wide banner for top-of-page slots",
    category: "display",
    format: "LEADERBOARD",
    width: 970,
    height: 90,
    sample: SAMPLE_AD,
  },
  {
    id: "rectangle",
    name: "Medium rectangle",
    description: "300×250 card — sidebar or in-content",
    category: "display",
    format: "RECTANGLE",
    width: 300,
    height: 250,
    sample: SAMPLE_AD,
  },
  {
    id: "skyscraper",
    name: "Skyscraper",
    description: "160×600 vertical unit for side rails",
    category: "display",
    format: "SKYSCRAPER",
    width: 160,
    height: 600,
    sample: SAMPLE_AD,
  },
  {
    id: "mobile",
    name: "Mobile banner",
    description: "320×50 compact strip for mobile web",
    category: "display",
    format: "MOBILE",
    width: 320,
    height: 50,
    sample: SAMPLE_AD,
  },
  {
    id: "text-inline",
    name: "In-line text ad",
    description: "Sponsored link line — fits between paragraphs",
    category: "text",
    format: "TEXT_INLINE",
    width: 0,
    height: 0,
    sample: {
      headline: "Sponsored · Grow your business with lacidaweb",
      primaryText: "",
      ctaLabel: "Visit site",
    },
  },
  {
    id: "text-box",
    name: "Text box ad",
    description: "Bordered text unit with headline, body, and CTA",
    category: "text",
    format: "TEXT_BOX",
    width: 300,
    height: 0,
    sample: {
      headline: "Advertise to millions of readers",
      primaryText: "Self-serve campaigns with wallet billing and fast review.",
      ctaLabel: "Get started",
    },
  },
  {
    id: "text-article",
    name: "Article text ad",
    description: "Native-style sponsored block for blog posts",
    category: "text",
    format: "TEXT",
    width: 0,
    height: 0,
    sample: {
      headline: "Sponsored story",
      primaryText:
        "Discover how brands use lacidaweb to run awareness, traffic, and conversion campaigns from one dashboard.",
      ctaLabel: "Read more",
    },
  },
];

export function getAdTemplate(id: string) {
  return PUBLISHER_AD_TEMPLATES.find((t) => t.id === id) ?? null;
}

export const PLACEMENT_PRESETS = Object.fromEntries(
  PUBLISHER_AD_TEMPLATES.map((t) => [
    t.id,
    { label: t.name, format: t.format, width: t.width, height: t.height },
  ]),
);

export const DISPLAY_TEMPLATES = PUBLISHER_AD_TEMPLATES.filter((t) => t.category === "display");
export const TEXT_TEMPLATES = PUBLISHER_AD_TEMPLATES.filter((t) => t.category === "text");

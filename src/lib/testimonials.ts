export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  initials: string;
  color: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    quote:
      "We moved our agency clients onto one dashboard for scheduling, inbox, and ads. Onboarding took an afternoon — the workflow finally feels unified.",
    name: "Elena Zarino",
    role: "Web Developer",
    initials: "EZ",
    color: "#7c3aed",
  },
  {
    id: "2",
    quote:
      "The inbox alone saved us hours every week. Comments and DMs from Facebook and Instagram land in one place instead of five tabs.",
    name: "Marcus Chen",
    role: "Social Media Manager",
    initials: "MC",
    color: "#2563eb",
  },
  {
    id: "3",
    quote:
      "AI captions plus unlimited scheduling let our small team post daily without hiring another writer. Tokens are cheap and predictable.",
    name: "Priya Nair",
    role: "Founder, Bloom Studio",
    initials: "PN",
    color: "#db2777",
  },
  {
    id: "4",
    quote:
      "Running paid campaigns next to organic posts changed how we plan launches. Connect once, set the budget, and publish from the same workspace.",
    name: "James Okonkwo",
    role: "Growth Lead",
    initials: "JO",
    color: "#059669",
  },
  {
    id: "5",
    quote:
      "Integration was straightforward — connect accounts, compose, schedule. Our e-commerce brand posts to six platforms without juggling logins.",
    name: "Razvan Ghetiu",
    role: "Founder, purplepalm.ai",
    initials: "RG",
    color: "#d97706",
  },
  {
    id: "6",
    quote:
      "Automations for comment replies paid for the subscription in the first month. Keyword rules handle FAQs while we focus on creative.",
    name: "Sofia Martinez",
    role: "Community Manager",
    initials: "SM",
    color: "#dc2626",
  },
  {
    id: "7",
    quote:
      "Analytics per channel helped us double down on what works. We finally see reach and engagement without exporting CSVs from every network.",
    name: "David Park",
    role: "Marketing Director",
    initials: "DP",
    color: "#0891b2",
  },
  {
    id: "8",
    quote:
      "Support tickets inside the app, billing with multiple payment methods, and a clean client dashboard — it feels like a real SaaS product.",
    name: "Amira Hassan",
    role: "Agency Owner",
    initials: "AH",
    color: "#7c2d12",
  },
  {
    id: "9",
    quote:
      "I spent months looking for one tool that handles publishing and engagement. This filled the gap — simple setup, everything in one login.",
    name: "Zahareus",
    role: "Developer",
    initials: "ZA",
    color: "#4f46e5",
  },
];

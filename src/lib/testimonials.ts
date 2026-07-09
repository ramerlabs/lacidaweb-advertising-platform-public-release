export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatarUrl: string;
};

/** UI face avatars via pravatar.cc — stable portrait photos for testimonial cards. */
export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    quote:
      "We moved our agency clients onto one dashboard for scheduling, inbox, and ads. Onboarding took an afternoon — the workflow finally feels unified.",
    name: "Elena Zarino",
    role: "Web Developer",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
  },
  {
    id: "2",
    quote:
      "The inbox alone saved us hours every week. Comments and DMs from Facebook and Instagram land in one place instead of five tabs.",
    name: "Marcus Chen",
    role: "Social Media Manager",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
  },
  {
    id: "3",
    quote:
      "AI captions plus unlimited scheduling let our small team post daily without hiring another writer. Tokens are cheap and predictable.",
    name: "Priya Nair",
    role: "Founder, Bloom Studio",
    avatarUrl: "https://i.pravatar.cc/150?img=9",
  },
  {
    id: "4",
    quote:
      "Running paid campaigns next to organic posts changed how we plan launches. Connect once, set the budget, and publish from the same workspace.",
    name: "James Okonkwo",
    role: "Growth Lead",
    avatarUrl: "https://i.pravatar.cc/150?img=15",
  },
  {
    id: "5",
    quote:
      "Integration was straightforward — connect accounts, compose, schedule. Our e-commerce brand posts to six platforms without juggling logins.",
    name: "Razvan Ghetiu",
    role: "Founder, purplepalm.ai",
    avatarUrl: "https://i.pravatar.cc/150?img=33",
  },
  {
    id: "6",
    quote:
      "Automations for comment replies paid for the subscription in the first month. Keyword rules handle FAQs while we focus on creative.",
    name: "Sofia Martinez",
    role: "Community Manager",
    avatarUrl: "https://i.pravatar.cc/150?img=20",
  },
  {
    id: "7",
    quote:
      "Analytics per channel helped us double down on what works. We finally see reach and engagement without exporting CSVs from every network.",
    name: "David Park",
    role: "Marketing Director",
    avatarUrl: "https://i.pravatar.cc/150?img=52",
  },
  {
    id: "8",
    quote:
      "Support tickets inside the app, billing with multiple payment methods, and a clean client dashboard — it feels like a real SaaS product.",
    name: "Amira Hassan",
    role: "Agency Owner",
    avatarUrl: "https://i.pravatar.cc/150?img=23",
  },
  {
    id: "9",
    quote:
      "I spent months looking for one tool that handles publishing and engagement. This filled the gap — simple setup, everything in one login.",
    name: "Zahareus",
    role: "Developer",
    avatarUrl: "https://i.pravatar.cc/150?img=68",
  },
];

import { PrismaClient } from "@prisma/client";

const LACIDAWEB_FAQS = [
  {
    question: "What is lacidaweb?",
    answer:
      "lacidaweb is a self-serve advertising platform. Create awareness, traffic, and conversion campaigns, fund a prepaid wallet, and track performance — similar to Facebook Ads, built for modern advertisers.",
    sortOrder: 0,
  },
  {
    question: "Do I need a subscription or KYC to run ads?",
    answer:
      "No. Create a free account with no KYC or ID verification, top up your wallet when you're ready, and pay for campaigns from your balance. You only spend when you run ads.",
    sortOrder: 1,
  },
  {
    question: "Which payment methods are supported?",
    answer:
      "USDT (ERC-20 / TRC-20), GCash, PayPal, and US bank transfer (ACH via Stripe). All top-ups credit your lacidaweb wallet balance.",
    sortOrder: 2,
  },
  {
    question: "When do my ads go live?",
    answer:
      "After you submit a campaign, our team reviews the ad creative (not your identity — there is no KYC). Once approved and your wallet has sufficient balance, your campaign goes active.",
    sortOrder: 3,
  },
  {
    question: "How does the campaign builder work?",
    answer:
      "Pick an objective (Awareness, Traffic, or Conversions), define your audience, set a daily or lifetime budget, then upload your ad creative. Submit for review when you're done.",
    sortOrder: 4,
  },
  {
    question: "How do publishers earn?",
    answer:
      "Publishers embed lacidaweb ads on their sites and earn on valid impressions (CPM) and clicks (CPC). Current rates and your share of network ad spend are shown on the homepage Publishers section. Fraud filters discard bots and duplicates before earnings are credited.",
    sortOrder: 5,
  },
  {
    question: "How do I get support?",
    answer:
      "Open a support ticket from your dashboard under Support. Our team will respond based on your request priority.",
    sortOrder: 6,
  },
];

const prisma = new PrismaClient();

await prisma.faq.deleteMany({});
await prisma.faq.createMany({
  data: LACIDAWEB_FAQS.map((faq) => ({
    question: faq.question,
    answer: faq.answer,
    sortOrder: faq.sortOrder,
    isPublished: true,
  })),
});

console.log(`Replaced FAQs with ${LACIDAWEB_FAQS.length} lacidaweb entries.`);
await prisma.$disconnect();

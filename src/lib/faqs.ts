import { prisma } from "@/lib/prisma";

export type FaqRecord = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_FAQS: Array<{ question: string; answer: string; sortOrder: number }> = [
  {
    question: "What is VCC & Bank?",
    answer:
      "VCC & Bank is an all-in-one platform for scheduling social posts, managing inbox messages, running automations, and tracking analytics — built for agencies, creators, and online businesses.",
    sortOrder: 0,
  },
  {
    question: "Which social platforms are supported?",
    answer:
      "You can connect and publish to major platforms including Instagram, TikTok, LinkedIn, YouTube, X (Twitter), Pinterest, Facebook, and more — depending on your connected accounts.",
    sortOrder: 1,
  },
  {
    question: "How do payments work?",
    answer:
      "Choose a plan and pay securely with USDT (TRC20), PayPal, or GCash. USDT payments can be verified automatically using your transaction hash. Your subscription activates once payment is confirmed.",
    sortOrder: 2,
  },
  {
    question: "Can I schedule posts in advance?",
    answer:
      "Yes. Create a post in the compose screen, pick your channels, set a date and time, and we will publish automatically when scheduled.",
    sortOrder: 3,
  },
  {
    question: "How do I get support?",
    answer:
      "Open a support ticket from your dashboard at any time. Our team will respond as quickly as possible based on your plan priority.",
    sortOrder: 4,
  },
  {
    question: "How do AI tokens work?",
    answer:
      "New workspaces receive free trial tokens. Buy more from Billing (pay with USDT, PayPal, or GCash). Tokens are used when you generate captions or images in Compose — text uses actual API token counts; images use a fixed token cost. Enable AI in Settings first.",
    sortOrder: 5,
  },
];

function hasFaqModel() {
  const delegate = (prisma as unknown as Record<string, unknown>).faq;
  return Boolean(delegate && typeof (delegate as { findMany?: unknown }).findMany === "function");
}

export async function ensureDefaultFaqs() {
  if (!hasFaqModel()) return;

  const count = await prisma.faq.count();
  if (count === 0) {
    await prisma.faq.createMany({
      data: DEFAULT_FAQS.map((faq) => ({
        question: faq.question,
        answer: faq.answer,
        sortOrder: faq.sortOrder,
        isPublished: true,
      })),
    });
    return;
  }

  const aiFaq = DEFAULT_FAQS.find((f) => f.question === "How do AI tokens work?");
  if (aiFaq) {
    const exists = await prisma.faq.findFirst({
      where: { question: aiFaq.question },
    });
    if (!exists) {
      await prisma.faq.create({
        data: {
          question: aiFaq.question,
          answer: aiFaq.answer,
          sortOrder: aiFaq.sortOrder,
          isPublished: true,
        },
      });
    }
  }
}

export async function getPublishedFaqs(): Promise<FaqRecord[]> {
  if (!hasFaqModel()) {
    return DEFAULT_FAQS.map((faq, index) => ({
      id: `default-${index}`,
      question: faq.question,
      answer: faq.answer,
      sortOrder: faq.sortOrder,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  await ensureDefaultFaqs();

  return prisma.faq.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function listAllFaqs(): Promise<FaqRecord[]> {
  if (!hasFaqModel()) {
    throw new Error("Database not ready. Restart the dev server, then run: npx prisma generate");
  }

  await ensureDefaultFaqs();

  return prisma.faq.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createFaq(input: {
  question: string;
  answer: string;
  sortOrder?: number;
  isPublished?: boolean;
}) {
  if (!hasFaqModel()) {
    throw new Error("Database not ready. Restart the dev server, then run: npx prisma generate");
  }

  const maxOrder = await prisma.faq.aggregate({ _max: { sortOrder: true } });
  const sortOrder = input.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

  return prisma.faq.create({
    data: {
      question: input.question.trim(),
      answer: input.answer.trim(),
      sortOrder,
      isPublished: input.isPublished ?? true,
    },
  });
}

export async function updateFaq(
  id: string,
  input: Partial<{ question: string; answer: string; sortOrder: number; isPublished: boolean }>,
) {
  if (!hasFaqModel()) {
    throw new Error("Database not ready. Restart the dev server, then run: npx prisma generate");
  }

  const data: Partial<{ question: string; answer: string; sortOrder: number; isPublished: boolean }> = {};
  if (input.question !== undefined) data.question = input.question.trim();
  if (input.answer !== undefined) data.answer = input.answer.trim();
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.isPublished !== undefined) data.isPublished = input.isPublished;

  return prisma.faq.update({ where: { id }, data });
}

export async function deleteFaq(id: string) {
  if (!hasFaqModel()) {
    throw new Error("Database not ready. Restart the dev server, then run: npx prisma generate");
  }

  await prisma.faq.delete({ where: { id } });
}

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

import { LACIDAWEB_FAQS } from "@/lib/lacidaweb-faqs";

const DEFAULT_FAQS = LACIDAWEB_FAQS.map((faq) => ({
  question: faq.question,
  answer: faq.answer,
  sortOrder: faq.sortOrder,
}));

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

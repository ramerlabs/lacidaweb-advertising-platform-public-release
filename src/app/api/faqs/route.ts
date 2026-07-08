import { NextResponse } from "next/server";
import { getPublishedFaqs } from "@/lib/faqs";

export async function GET() {
  try {
    const faqs = await getPublishedFaqs();
    return NextResponse.json({
      faqs: faqs.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load FAQs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

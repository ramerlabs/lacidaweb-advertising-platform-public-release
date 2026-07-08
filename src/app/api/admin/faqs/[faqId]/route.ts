import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { deleteFaq, updateFaq } from "@/lib/faqs";

const updateSchema = z.object({
  question: z.string().min(3).max(500).optional(),
  answer: z.string().min(3).max(10000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ faqId: string }> }) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const { faqId } = await params;
    const body = updateSchema.parse(await req.json());
    const faq = await updateFaq(faqId, body);
    return NextResponse.json({ faq });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ faqId: string }> }) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const { faqId } = await params;
    await deleteFaq(faqId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

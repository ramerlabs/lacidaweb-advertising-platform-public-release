import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activatePayment } from "@/services/payment-activation";

const schema = z.object({
  status: z.enum(["PAID", "FAILED"]),
  notes: z.string().optional(),
});

type Params = { params: Promise<{ paymentId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const paymentId = (await params).paymentId;
    const body = schema.parse(await req.json());

    const existing = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (body.status === "PAID") {
      const payment = await activatePayment(existing, { notes: body.notes });
      return NextResponse.json({ payment });
    }

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "FAILED",
        notes: body.notes,
      },
    });

    if (existing.subscriptionId) {
      await prisma.subscription.update({
        where: { id: existing.subscriptionId },
        data: { status: "PAST_DUE" },
      });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

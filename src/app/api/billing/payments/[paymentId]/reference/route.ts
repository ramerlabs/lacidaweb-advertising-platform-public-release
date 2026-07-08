import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAdminPaymentCreated } from "@/services/admin-notify";

const schema = z.object({
  teamId: z.string(),
  reference: z.string().min(2).max(120),
});

type Params = { params: Promise<{ paymentId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const paymentId = (await params).paymentId;
    const body = schema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.teamId !== body.teamId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    if (payment.status !== "PENDING") {
      return NextResponse.json({ error: "Payment is not pending" }, { status: 400 });
    }
    if (payment.method !== "US_BANK") {
      return NextResponse.json({ error: "Reference is only used for US bank payments" }, { status: 400 });
    }

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        externalRef: body.reference.trim(),
        notes: `${payment.notes || ""}\n\nClient reference: ${body.reference.trim()}`,
      },
    });

    notifyAdminPaymentCreated({
      teamId: body.teamId,
      method: payment.method,
      amount: payment.amount,
      planId: payment.purpose === "AI_CREDITS" ? "ai-tokens" : "subscription",
      paymentId: payment.id,
    });

    return NextResponse.json({
      payment: updated,
      message: "Reference submitted. We will confirm your payment after reviewing the transfer.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

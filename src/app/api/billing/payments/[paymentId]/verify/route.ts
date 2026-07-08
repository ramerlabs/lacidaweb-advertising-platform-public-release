import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyAndActivateUsdtPayment } from "@/services/usdt-payment";

const schema = z.object({
  teamId: z.string().min(1),
  txHash: z.string().min(10).max(128),
});

type Params = { params: Promise<{ paymentId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const paymentId = (await params).paymentId;
    const body = schema.parse(await req.json());

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);
    if (payment.teamId !== body.teamId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const result = await verifyAndActivateUsdtPayment(paymentId, body.txHash.trim());

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

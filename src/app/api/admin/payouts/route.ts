import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewPublisherPayout } from "@/services/publisher-payouts";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);

    const status = new URL(req.url).searchParams.get("status");
    const payouts = await prisma.publisherPayout.findMany({
      where: status ? { status: status as "PENDING" } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        team: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({
      payouts: payouts.map((p) => ({
        id: p.id,
        teamId: p.teamId,
        teamName: p.team.name,
        amountCents: p.amountCents,
        method: p.method,
        status: p.status,
        payoutDetails: p.payoutDetails,
        notes: p.notes,
        adminNotes: p.adminNotes,
        rejectionReason: p.rejectionReason,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "MARK_PAID"]),
  adminNotes: z.string().max(2000).optional(),
  rejectionReason: z.string().max(500).optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);

    const payoutId = new URL(req.url).searchParams.get("id");
    if (!payoutId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = reviewSchema.parse(await req.json());
    const payout = await reviewPublisherPayout({
      payoutId,
      reviewerId: session.user.id,
      action: body.action,
      adminNotes: body.adminNotes,
      rejectionReason: body.rejectionReason,
    });

    return NextResponse.json({ payout, message: `Payout ${body.action.toLowerCase()}` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

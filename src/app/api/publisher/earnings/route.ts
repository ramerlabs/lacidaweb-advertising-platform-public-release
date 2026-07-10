import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import {
  createPublisherPayoutRequest,
  getAvailablePayoutMethods,
  getPublisherEarningsSummary,
  listPublisherPayouts,
} from "@/services/publisher-payouts";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const [summary, payouts, methods] = await Promise.all([
      getPublisherEarningsSummary(teamId),
      listPublisherPayouts(teamId),
      getAvailablePayoutMethods(),
    ]);

    return NextResponse.json({
      summary,
      payouts,
      methods,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

const createSchema = z.object({
  teamId: z.string().min(1),
  amountUsd: z.number().positive().max(100_000),
  method: z.enum(["USDT", "PAYPAL", "GCASH", "US_BANK"]),
  payoutDetails: z.string().min(5).max(2000),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = createSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);

    const payout = await createPublisherPayoutRequest({
      teamId: body.teamId,
      amountCents: Math.round(body.amountUsd * 100),
      method: body.method,
      payoutDetails: body.payoutDetails,
      notes: body.notes,
    });

    return NextResponse.json({
      payout,
      message: "Payout request submitted for review",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import type { PaymentMethod } from "@prisma/client";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { createAdCampaignPayment, getAdCampaignCheckoutContext } from "@/services/ad-billing";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const teamId = url.searchParams.get("teamId");
    const campaignId = url.searchParams.get("campaignId");
    if (!teamId || !campaignId) {
      return NextResponse.json({ error: "teamId and campaignId required" }, { status: 400 });
    }
    await requireTeamAccess(teamId, session.user.id);

    const context = await getAdCampaignCheckoutContext(campaignId, teamId);
    return NextResponse.json(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

const schema = z.object({
  teamId: z.string().min(1),
  campaignId: z.string().min(1),
  method: z.enum(["USDT", "PAYPAL", "GCASH", "US_BANK"]),
  proofUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);

    const result = await createAdCampaignPayment({
      teamId: body.teamId,
      campaignId: body.campaignId,
      method: body.method as PaymentMethod,
      proofUrl: body.proofUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

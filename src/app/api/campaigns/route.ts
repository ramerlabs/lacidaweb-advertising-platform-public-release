import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { apiCreateCampaignSchema } from "@/lib/validations/campaign";
import { createLacidawebCampaign, listTeamCampaigns } from "@/services/campaigns";

const listQuerySchema = z.object({
  teamId: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { teamId } = listQuerySchema.parse({
      teamId: new URL(req.url).searchParams.get("teamId"),
    });
    await requireTeamAccess(teamId, session.user.id);

    const campaigns = await listTeamCampaigns(teamId, session.user.id);
    return NextResponse.json({ campaigns });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to load campaigns";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "BANNED" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = apiCreateCampaignSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN", "MEMBER"]);

    const campaign = await createLacidawebCampaign({
      teamId: body.teamId,
      userId: session.user.id,
      name: body.name,
      objective: body.objective,
      targeting: body.targeting,
      budgetType: body.budgetType,
      budgetAmountUsd: body.budgetAmountUsd,
      scheduleStart: body.scheduleStart,
      scheduleEnd: body.scheduleEnd,
      ads: body.ads,
      platform: body.platform,
      adAccountId: body.adAccountId,
    });

    return NextResponse.json({
      campaign,
      message:
        "Campaign submitted for review. Your campaign budget was reserved from your wallet and will be refunded if the campaign is rejected.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to create campaign";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "BANNED" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { updateCampaignStatus } from "@/services/ads";

const schema = z.object({
  teamId: z.string().min(1),
  platformCampaignId: z.string().min(1),
  platform: z.string().min(1),
  status: z.enum(["ACTIVE", "PAUSED"]),
});

type Params = { params: Promise<{ campaignId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);

    await updateCampaignStatus({
      teamId: body.teamId,
      userId: session.user.id,
      platformCampaignId: (await params).campaignId || body.platformCampaignId,
      platform: body.platform,
      status: body.status,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

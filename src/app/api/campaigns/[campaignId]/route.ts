import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import {
  deleteTeamCampaign,
  getTeamCampaign,
  pauseTeamCampaign,
  resumeTeamCampaign,
} from "@/services/campaigns";

const patchSchema = z.object({
  teamId: z.string().min(1),
  action: z.enum(["PAUSE", "RESUME"]),
});

const deleteSchema = z.object({
  teamId: z.string().min(1),
});

export async function GET(req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  try {
    const session = await requireSession();
    const { campaignId } = await params;
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const campaign = await getTeamCampaign(teamId, campaignId);
    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "Campaign not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  try {
    const session = await requireSession();
    const { campaignId } = await params;
    const body = patchSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN", "MEMBER"]);

    const campaign =
      body.action === "PAUSE"
        ? await pauseTeamCampaign(body.teamId, campaignId, session.user.id)
        : await resumeTeamCampaign(body.teamId, campaignId, session.user.id);

    return NextResponse.json({
      campaign,
      message: body.action === "PAUSE" ? "Campaign paused" : "Campaign resumed",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "Campaign not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  try {
    const session = await requireSession();
    const { campaignId } = await params;
    const body = deleteSchema.parse(await req.json().catch(() => ({})));
    const teamId = body.teamId || new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id, ["OWNER", "ADMIN", "MEMBER"]);

    await deleteTeamCampaign(teamId, campaignId, session.user.id);
    return NextResponse.json({ ok: true, message: "Campaign deleted" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "Campaign not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

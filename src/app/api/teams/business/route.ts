import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUSINESS_PROFILE_SELECT, toBusinessProfile } from "@/lib/team-business";

const patchSchema = z.object({
  teamId: z.string().min(1),
  businessName: z.string().max(120).optional(),
  businessDescription: z.string().max(2000).optional(),
  businessIndustry: z.string().max(120).optional(),
  businessAudience: z.string().max(500).optional(),
  businessWebsite: z.string().max(200).optional(),
  businessLocation: z.string().max(120).optional(),
  brandVoice: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

    await requireTeamAccess(teamId, session.user.id);
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: BUSINESS_PROFILE_SELECT,
    });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const profile = toBusinessProfile(team);
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const body = patchSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);

    const team = await prisma.team.update({
      where: { id: body.teamId },
      data: {
        businessName: body.businessName?.trim() || null,
        businessDescription: body.businessDescription?.trim() || null,
        businessIndustry: body.businessIndustry?.trim() || null,
        businessAudience: body.businessAudience?.trim() || null,
        businessWebsite: body.businessWebsite?.trim() || null,
        businessLocation: body.businessLocation?.trim() || null,
        brandVoice: body.brandVoice?.trim() || null,
      },
      select: BUSINESS_PROFILE_SELECT,
    });

    const profile = toBusinessProfile(team);
    return NextResponse.json({ profile, message: "Business profile saved" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

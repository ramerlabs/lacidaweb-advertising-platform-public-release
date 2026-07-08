import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStandaloneAd, listTeamCampaigns } from "@/services/ads";
import { ensureTeamZernioProfile } from "@/services/profiles";

const createSchema = z.object({
  teamId: z.string().min(1),
  connectedAccountId: z.string().min(1),
  adAccountId: z.string().min(1),
  name: z.string().min(1).max(255),
  goal: z.enum(["engagement", "traffic", "awareness", "video_views"]),
  body: z.string().min(1).max(2000),
  headline: z.string().min(1).max(255),
  linkUrl: z.string().url(),
  imageUrl: z.string().url(),
  budgetAmount: z.number().min(1),
  budgetType: z.enum(["daily", "lifetime"]),
  countries: z.array(z.string().length(2)).optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  payWith: z.enum(["wallet", "checkout"]).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const profileId = await ensureTeamZernioProfile(teamId);
    const [remote, local] = await Promise.all([
      listTeamCampaigns(teamId, profileId).catch(() => []),
      prisma.adCampaign.findMany({
        where: { teamId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return NextResponse.json({ campaigns: remote, localCampaigns: local });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = createSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);

    const result = await createStandaloneAd({
      ...body,
      goal: body.goal as "engagement" | "traffic" | "awareness" | "video_views",
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

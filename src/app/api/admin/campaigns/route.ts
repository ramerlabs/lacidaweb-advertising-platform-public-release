import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteTeamCampaign, pauseTeamCampaign, resumeTeamCampaign } from "@/services/campaigns";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);

    const campaigns = await prisma.adCampaign.findMany({
      where: { adType: "lacidaweb" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        team: { select: { name: true, slug: true } },
        ads: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });

    return NextResponse.json({
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        teamId: c.teamId,
        teamName: c.team.name,
        objective: c.objective,
        lifecycleStatus: c.lifecycleStatus,
        budgetAmount: c.budgetAmount,
        budgetType: c.budgetType,
        paymentStatus: c.paymentStatus,
        createdAt: c.createdAt.toISOString(),
        headline: c.ads[0]?.headline ?? c.headline,
        imageUrl: c.ads[0]?.imageUrl ?? c.imageUrl,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

const reviewSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED", "PAUSE", "RESUME", "DELETE"]),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);

    const url = new URL(req.url);
    const campaignId = url.searchParams.get("id");
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign id required" }, { status: 400 });
    }

    const body = reviewSchema.parse(await req.json());

    const campaign = await prisma.adCampaign.findFirst({
      where: { id: campaignId, adType: "lacidaweb" },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (body.action === "DELETE") {
      await deleteTeamCampaign(campaign.teamId, campaignId, session.user.id);
      return NextResponse.json({ ok: true, deleted: true });
    }

    if (body.action === "PAUSE") {
      await pauseTeamCampaign(campaign.teamId, campaignId, session.user.id);
      return NextResponse.json({ ok: true, lifecycleStatus: "PAUSED" });
    }

    if (body.action === "RESUME") {
      await resumeTeamCampaign(campaign.teamId, campaignId, session.user.id);
      return NextResponse.json({ ok: true, lifecycleStatus: "ACTIVE" });
    }

    const lifecycleStatus = body.action === "APPROVED" ? "ACTIVE" : "REJECTED";
    const status = body.action === "APPROVED" ? "active" : "rejected";

    await prisma.$transaction([
      prisma.adCampaign.update({
        where: { id: campaignId },
        data: {
          lifecycleStatus,
          status,
          reviewedAt: new Date(),
          reviewedById: session.user.id,
          rejectionReason: body.action === "REJECTED" ? body.notes || "Rejected by admin" : null,
        },
      }),
      prisma.ad.updateMany({
        where: { campaignId },
        data: {
          status: body.action === "APPROVED" ? "ACTIVE" : "REJECTED",
        },
      }),
      prisma.campaignReview.create({
        data: {
          campaignId,
          reviewerId: session.user.id,
          action: body.action,
          notes: body.notes,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, lifecycleStatus });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

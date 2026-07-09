import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { createAndPublishPost, getMediaPresignedUrl } from "@/services/publisher";
import { syncTeamPostStatuses } from "@/services/post-sync";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  teamId: z.string(),
  content: z.string().default(""),
  mediaUrls: z.array(z.string().url()).optional(),
  connectedAccountIds: z.array(z.string()).default([]),
  publishNow: z.boolean().optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  timezone: z.string().optional(),
  platformOptions: z.record(z.any()).optional(),
  platformSpecificText: z.record(z.string()).optional(),
  draft: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    if (searchParams.get("sync") === "1") {
      await syncTeamPostStatuses(teamId);
    }

    const posts = await prisma.post.findMany({
      where: { teamId },
      include: { targets: { include: { connectedAccount: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = createSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id);

    const post = await createAndPublishPost({
      ...body,
      userId: session.user.id,
    });

    return NextResponse.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

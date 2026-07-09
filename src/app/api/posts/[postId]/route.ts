import { NextResponse } from "next/server";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PublishStatus } from "@prisma/client";

type Params = { params: Promise<{ postId: string }> };

const CANCELLABLE: PublishStatus[] = ["SCHEDULED", "DRAFT", "PENDING"];

export async function DELETE(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const postId = (await params).postId;
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    await requireTeamAccess(teamId, session.user.id, ["OWNER", "ADMIN", "MEMBER"]);

    const post = await prisma.post.findFirst({
      where: { id: postId, teamId },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (!CANCELLABLE.includes(post.status)) {
      return NextResponse.json(
        { error: "Only scheduled, draft, or pending posts can be cancelled" },
        { status: 400 },
      );
    }

    await prisma.post.delete({ where: { id: postId } });

    await prisma.auditLog.create({
      data: {
        teamId,
        userId: session.user.id,
        postId,
        action: "post.cancelled",
        status: post.status,
        message: `Cancelled ${post.status.toLowerCase()} post`,
      },
    });

    return NextResponse.json({ ok: true, deletedPostId: postId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

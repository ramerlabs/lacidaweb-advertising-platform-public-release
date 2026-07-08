import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { listInbox, replyToInboxItem, syncInboxFromZernio } from "@/services/inbox";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const type = searchParams.get("type") as "COMMENT" | "MESSAGE" | null;
    const shouldSync = searchParams.get("sync") === "1";
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    let syncResult: Awaited<ReturnType<typeof syncInboxFromZernio>> | null = null;
    if (shouldSync) {
      try {
        syncResult = await syncInboxFromZernio(teamId);
      } catch (error) {
        syncResult = {
          synced: 0,
          syncedMessages: 0,
          postsChecked: 0,
          conversationsChecked: 0,
          error: error instanceof Error ? error.message : "Sync failed",
        };
      }
    }

    const items = await listInbox(teamId, type || undefined);
    return NextResponse.json({ items, sync: syncResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const replySchema = z.object({
  teamId: z.string(),
  inboxItemId: z.string(),
  text: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = replySchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id);
    const item = await replyToInboxItem(body);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reply failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const ruleSchema = z.object({
  teamId: z.string(),
  name: z.string().min(2),
  keywords: z.array(z.string().min(1)).min(1),
  matchMode: z.enum(["any", "all"]).default("any"),
  replyType: z.enum(["comment", "dm"]).default("comment"),
  replyTemplate: z.string().min(1),
  platforms: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export async function PUT(req: Request) {
  try {
    const session = await requireSession();
    const body = ruleSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);

    const rule = await prisma.autoReplyRule.create({
      data: {
        teamId: body.teamId,
        name: body.name,
        keywords: body.keywords,
        matchMode: body.matchMode,
        replyType: body.replyType,
        replyTemplate: body.replyTemplate,
        platforms: body.platforms,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rule create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

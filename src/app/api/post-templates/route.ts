import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  teamId: z.string(),
  name: z.string().min(1).max(120),
  prompt: z.string().min(1).max(4000),
  tone: z.string().max(50).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const templates = await prisma.postTemplate.findMany({
      where: { teamId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = createSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id);

    const template = await prisma.postTemplate.create({
      data: {
        teamId: body.teamId,
        name: body.name,
        prompt: body.prompt,
        tone: body.tone,
      },
    });
    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireSession();
    const id = new URL(req.url).searchParams.get("id");
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!id || !teamId) return NextResponse.json({ error: "id and teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    await prisma.postTemplate.deleteMany({ where: { id, teamId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

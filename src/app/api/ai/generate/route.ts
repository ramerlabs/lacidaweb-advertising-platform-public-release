import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePostImage, generatePostText } from "@/lib/ai-service";
import { getAiSettings, toPublicAiSettings } from "@/lib/ai-settings";

const textSchema = z.object({
  teamId: z.string().min(1),
  prompt: z.string().min(1).max(2000),
  tone: z.string().max(100).optional(),
  platform: z.string().max(50).optional(),
});

const imageSchema = z.object({
  teamId: z.string().min(1),
  prompt: z.string().min(1).max(1000),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

    await requireTeamAccess(teamId, session.user.id);
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { aiEnabled: true, aiBalanceCents: true },
    });
    const settings = await getAiSettings();

    return NextResponse.json({
      aiEnabled: settings.aiEnabled,
      teamAiEnabled: team?.aiEnabled ?? false,
      balanceCents: team?.aiBalanceCents ?? 0,
      pricing: toPublicAiSettings(settings).clientPricing,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "text") {
      const body = textSchema.parse(await req.json());
      await requireTeamAccess(body.teamId, session.user.id);
      const result = await generatePostText(body);
      return NextResponse.json(result);
    }

    if (action === "image") {
      const body = imageSchema.parse(await req.json());
      await requireTeamAccess(body.teamId, session.user.id);
      const result = await generatePostImage(body);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

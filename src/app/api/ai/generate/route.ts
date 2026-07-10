import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import {
  generatePostImage,
  generatePostText,
  generateAdCreative,
  generateCampaignAssist,
  transformPostText,
} from "@/lib/ai-service";
import { getAiSettings, toPublicAiSettings } from "@/lib/ai-settings";
import {
  isBusinessProfileComplete,
  toBusinessProfile,
  BUSINESS_PROFILE_SELECT,
  getTeamBusinessContext,
} from "@/lib/team-business";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const textSchema = z.object({
  teamId: z.string().min(1),
  prompt: z.string().max(2000).optional().default(""),
  tone: z.string().max(100).optional(),
  platform: z.string().max(50).optional(),
});

const transformSchema = z.object({
  teamId: z.string().min(1),
  content: z.string().min(1).max(4000),
  mode: z.enum(["shorten", "hashtags", "regenerate"]),
  tone: z.string().max(100).optional(),
});

const imageSchema = z.object({
  teamId: z.string().min(1),
  prompt: z.string().max(1000).optional().default(""),
});

const adSchema = z.object({
  teamId: z.string().min(1),
  prompt: z.string().max(2000).optional().default(""),
  goal: z.string().max(50).optional(),
  platform: z.string().max(80).optional(),
  tone: z.string().max(100).optional(),
});

const campaignAssistSchema = z.object({
  teamId: z.string().min(1),
  step: z.enum(["objective", "audience", "budget", "creative"]),
  prompt: z.string().max(2000).optional().default(""),
  context: z
    .object({
      name: z.string().optional(),
      objective: z.string().optional(),
      targeting: z.unknown().optional(),
      budgetType: z.string().optional(),
      budgetAmountUsd: z.union([z.string(), z.number()]).optional(),
      format: z.string().optional(),
    })
    .optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

    await requireTeamAccess(teamId, session.user.id);
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { aiEnabled: true, aiTokenBalance: true, ...BUSINESS_PROFILE_SELECT },
    });
    const settings = await getAiSettings();
    const profile = team ? toBusinessProfile(team) : null;

    return NextResponse.json({
      aiEnabled: settings.aiEnabled,
      teamAiEnabled: team?.aiEnabled ?? false,
      tokenBalance: team?.aiTokenBalance ?? 0,
      businessProfileComplete: profile ? isBusinessProfileComplete(profile) : false,
      pricing: toPublicAiSettings(settings).clientPricing,
      models: {
        text: "gpt-4o-mini",
        image: "gpt-image-1-mini",
      },
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
    if (!checkRateLimit(`ai:${session.user.id}`, 30, 60_000)) {
      return NextResponse.json({ error: "Too many AI requests. Try again in a minute." }, { status: 429 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "text") {
      const body = textSchema.parse(await req.json());
      await requireTeamAccess(body.teamId, session.user.id);
      const result = await generatePostText(body);
      return NextResponse.json(result);
    }

    if (action === "transform") {
      const body = transformSchema.parse(await req.json());
      await requireTeamAccess(body.teamId, session.user.id);
      const result = await transformPostText(body);
      return NextResponse.json(result);
    }

    if (action === "image") {
      const body = imageSchema.parse(await req.json());
      await requireTeamAccess(body.teamId, session.user.id);
      const result = await generatePostImage(body);
      return NextResponse.json(result);
    }

    if (action === "ad") {
      const body = adSchema.parse(await req.json());
      await requireTeamAccess(body.teamId, session.user.id);
      const biz = await getTeamBusinessContext(body.teamId);
      if (!biz.complete) {
        return NextResponse.json(
          {
            error:
              "Save your business details first (name/industry + description) so AI can write on-brand creatives.",
            businessProfileComplete: false,
          },
          { status: 400 },
        );
      }
      const result = await generateAdCreative(body);
      return NextResponse.json(result);
    }

    if (action === "campaign") {
      const body = campaignAssistSchema.parse(await req.json());
      await requireTeamAccess(body.teamId, session.user.id);
      if (body.step === "creative") {
        const biz = await getTeamBusinessContext(body.teamId);
        if (!biz.complete) {
          return NextResponse.json(
            {
              error:
                "Save your business details first (name/industry + description) so AI can write on-brand creatives.",
              businessProfileComplete: false,
            },
            { status: 400 },
          );
        }
      }
      const result = await generateCampaignAssist(body);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

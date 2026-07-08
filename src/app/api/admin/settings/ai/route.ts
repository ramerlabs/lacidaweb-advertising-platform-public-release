import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { getAiSettings, updateAiSettings } from "@/lib/ai-settings";

const schema = z.object({
  openaiApiKey: z.string().optional(),
  aiEnabled: z.boolean().optional(),
  aiProfitMarginPercent: z.number().int().min(0).max(99).optional(),
  aiTextInputCostPerMillion: z.number().min(0).optional(),
  aiTextOutputCostPerMillion: z.number().min(0).optional(),
  aiImageCostUsd: z.number().min(0).optional(),
  aiCreditPackUsd: z.number().min(1).optional(),
  aiCreditsPerPackCents: z.number().int().min(100).optional(),
  aiTrialTokens: z.number().int().min(0).optional(),
  aiLowTokenThreshold: z.number().int().min(0).optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const settings = await getAiSettings();
    return NextResponse.json({
      settings: {
        ...settings,
        openaiApiKey: undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const body = schema.parse(await req.json());
    const settings = await updateAiSettings(body);
    return NextResponse.json({
      settings: {
        ...settings,
        openaiApiKey: undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from "next/server";
import { getAiSettings, toPublicAiSettings } from "@/lib/ai-settings";

export async function GET() {
  try {
    const settings = await getAiSettings();
    return NextResponse.json({ settings: toPublicAiSettings(settings) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

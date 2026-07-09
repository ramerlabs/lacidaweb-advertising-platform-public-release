import { NextResponse } from "next/server";
import { getPublicOAuthProviders } from "@/lib/oauth-settings";

export async function GET() {
  try {
    const providers = await getPublicOAuthProviders();
    return NextResponse.json({ providers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message, providers: [] }, { status: 500 });
  }
}

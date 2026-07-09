import { NextResponse } from "next/server";
import { getActivePlans } from "@/lib/pricing";

export async function GET() {
  try {
    const plans = await getActivePlans();
    return NextResponse.json({ plans });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

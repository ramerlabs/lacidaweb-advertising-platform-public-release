import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export async function GET() {
  try {
    const session = await requireSession();
    const isAdmin = isPlatformAdminEmail(session.user.email);
    return NextResponse.json({ isAdmin });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "BANNED" ? 403 : 400;
    return NextResponse.json({ error: message, isAdmin: false }, { status });
  }
}

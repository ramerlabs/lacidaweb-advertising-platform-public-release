import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { AD_PLATFORMS, isAdsPlatform } from "@/lib/ads-platforms";
import { startAdsPlatformConnect } from "@/services/ads";

const platformSchema = z.string().refine((v) => isAdsPlatform(v), { message: "Invalid ads platform" });

const schema = z.object({
  teamId: z.string().min(1),
  platform: platformSchema,
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);

    const result = await startAdsPlatformConnect({
      teamId: body.teamId,
      platform: body.platform,
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

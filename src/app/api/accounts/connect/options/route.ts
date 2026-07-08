import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import {
  listConnectOptions,
  parseHeadlessCallback,
  type HeadlessCallbackParams,
} from "@/services/connect-headless";

const querySchema = z.object({
  teamId: z.string().min(1),
  profileId: z.string().min(1),
  platform: z.string().min(1),
  step: z.string().optional(),
  tempToken: z.string().optional(),
  userProfile: z.string().optional(),
  connect_token: z.string().optional(),
  pendingDataToken: z.string().optional(),
  mode: z.enum(["organic", "ads"]).optional(),
});

function toParams(input: z.infer<typeof querySchema>): HeadlessCallbackParams {
  const sp = new URLSearchParams();
  sp.set("profileId", input.profileId);
  sp.set("platform", input.platform);
  if (input.step) sp.set("step", input.step);
  if (input.tempToken) sp.set("tempToken", input.tempToken);
  if (input.userProfile) sp.set("userProfile", input.userProfile);
  if (input.connect_token) sp.set("connect_token", input.connect_token);
  if (input.pendingDataToken) sp.set("pendingDataToken", input.pendingDataToken);
  if (input.mode) sp.set("mode", input.mode);
  return parseHeadlessCallback(sp);
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.parse({
      teamId: searchParams.get("teamId"),
      profileId: searchParams.get("profileId"),
      platform: searchParams.get("platform"),
      step: searchParams.get("step") || undefined,
      tempToken: searchParams.get("tempToken") || undefined,
      userProfile: searchParams.get("userProfile") || undefined,
      connect_token: searchParams.get("connect_token") || undefined,
      pendingDataToken: searchParams.get("pendingDataToken") || undefined,
      mode: (searchParams.get("mode") as "organic" | "ads") || undefined,
    });

    await requireTeamAccess(parsed.teamId, session.user.id);
    const result = await listConnectOptions(toParams(parsed));

    return NextResponse.json({
      selectionLabel: result.selectionLabel,
      options: result.options,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load options";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

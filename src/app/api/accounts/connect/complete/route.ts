import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { syncConnectedAccounts } from "@/services/accounts";
import {
  completeConnectSelection,
  parseHeadlessCallback,
  type HeadlessCallbackParams,
} from "@/services/connect-headless";
import { notifyAdminAccountConnected } from "@/services/admin-notify";

const bodySchema = z.object({
  teamId: z.string().min(1),
  profileId: z.string().min(1),
  platform: z.string().min(1),
  selectedId: z.string().min(1),
  selectedRaw: z.record(z.unknown()).optional(),
  step: z.string().optional(),
  tempToken: z.string().optional(),
  userProfile: z.string().optional(),
  connect_token: z.string().optional(),
  pendingDataToken: z.string().optional(),
  mode: z.enum(["organic", "ads"]).optional(),
  adsPlatform: z.string().optional(),
});

function toParams(input: z.infer<typeof bodySchema>): HeadlessCallbackParams {
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

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = bodySchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN", "MEMBER"]);

    const result = await completeConnectSelection({
      params: toParams(body),
      teamId: body.teamId,
      selectedId: body.selectedId,
      selectedRaw: body.selectedRaw,
    });

    await syncConnectedAccounts(body.teamId);
    notifyAdminAccountConnected({
      teamId: body.teamId,
      platform: body.adsPlatform || body.platform,
    });

    const redirectPath =
      body.mode === "ads" || body.adsPlatform
        ? "/dashboard/ads?connected=1"
        : "/dashboard/accounts?connected=1";

    return NextResponse.json({
      ok: true,
      accountId: result.accountId,
      redirectPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete connection";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

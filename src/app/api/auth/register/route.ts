import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser } from "@/lib/auth-options";
import { notifyAdminUserRegistered } from "@/services/admin-notify";
import { requireActiveLicense } from "@/lib/license";
import { apiErrorResponse } from "@/lib/api-error";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  teamName: z.string().min(2),
  accountType: z.enum(["ADVERTISER", "PUBLISHER"]).default("ADVERTISER"),
});

export async function POST(req: Request) {
  try {
    await requireActiveLicense();
    const body = schema.parse(await req.json());
    const user = await registerUser(body);
    notifyAdminUserRegistered({
      name: body.name,
      email: body.email,
      teamName: body.teamName,
      teamId: user.memberships[0]?.teamId,
    });
    return NextResponse.json({
      id: user.id,
      email: user.email,
      teamId: user.memberships[0]?.teamId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LICENSE_REQUIRED") {
      return apiErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

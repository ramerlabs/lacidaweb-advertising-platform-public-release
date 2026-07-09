import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createUserWorkspace, userNeedsOnboarding } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notifyAdminUserRegistered } from "@/services/admin-notify";
import { parseAccountType } from "@/lib/account-type";

const schema = z.object({
  teamName: z.string().min(2).max(120),
  accountType: z.enum(["ADVERTISER", "PUBLISHER"]).optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const needsOnboarding = await userNeedsOnboarding(session.user.id);
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, accountType: true },
    });
    return NextResponse.json({
      needsOnboarding,
      name: user?.name,
      email: user?.email,
      accountType: user?.accountType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "BANNED" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());

    const needsOnboarding = await userNeedsOnboarding(session.user.id);
    if (!needsOnboarding) {
      return NextResponse.json({ error: "Workspace already exists" }, { status: 400 });
    }

    const urlType = parseAccountType(new URL(req.url).searchParams.get("type")?.toUpperCase());
    const accountType = body.accountType || urlType || "ADVERTISER";

    await prisma.user.update({
      where: { id: session.user.id },
      data: { accountType },
    });

    const team = await createUserWorkspace({
      userId: session.user.id,
      teamName: body.teamName,
      grantTrialTokens: accountType === "ADVERTISER",
      accountType,
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, accountType: true },
    });

    notifyAdminUserRegistered({
      name: user?.name || "New user",
      email: user?.email || session.user.email || "",
      teamName: body.teamName,
      teamId: team.id,
    });

    return NextResponse.json({
      teamId: team.id,
      teamName: team.name,
      accountType: user?.accountType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "BANNED" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

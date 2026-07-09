import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createUserWorkspace, userNeedsOnboarding } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notifyAdminUserRegistered } from "@/services/admin-notify";

const schema = z.object({
  teamName: z.string().min(2).max(120),
});

export async function GET() {
  try {
    const session = await requireSession();
    const needsOnboarding = await userNeedsOnboarding(session.user.id);
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    return NextResponse.json({
      needsOnboarding,
      name: user?.name,
      email: user?.email,
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

    const team = await createUserWorkspace({
      userId: session.user.id,
      teamName: body.teamName,
      grantTrialTokens: true,
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    notifyAdminUserRegistered({
      name: user?.name || "Social user",
      email: user?.email || session.user.email || "",
      teamName: body.teamName,
      teamId: team.id,
    });

    return NextResponse.json({ teamId: team.id, teamName: team.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "BANNED" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

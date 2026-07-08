import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  teamId: z.string().min(1),
  aiEnabled: z.boolean(),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id, ["OWNER", "ADMIN"]);

    const team = await prisma.team.update({
      where: { id: body.teamId },
      data: { aiEnabled: body.aiEnabled },
      select: { aiEnabled: true, aiBalanceCents: true },
    });

    return NextResponse.json({ team });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

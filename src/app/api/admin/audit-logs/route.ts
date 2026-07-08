import { NextResponse } from "next/server";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const limit = Math.min(100, Number(new URL(req.url).searchParams.get("limit") || 50));

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        team: { select: { name: true, slug: true } },
        user: { select: { email: true, name: true } },
      },
    });
    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

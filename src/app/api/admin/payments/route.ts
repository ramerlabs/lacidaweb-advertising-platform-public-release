import { NextResponse } from "next/server";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);

    const payments = await prisma.payment.findMany({
      include: { team: true, subscription: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ payments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);

    const result = await prisma.payment.deleteMany({});
    return NextResponse.json({ ok: true, deletedCount: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

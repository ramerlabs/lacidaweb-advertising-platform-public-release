import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const body = schema.parse(await req.json());

    const result = await prisma.supportTicket.deleteMany({
      where: { id: { in: body.ids } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

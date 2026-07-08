import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
});

/** Soft check for ban messaging after failed login (email only). */
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase().trim() },
      select: { bannedAt: true, banReason: true },
    });
    return NextResponse.json({
      banned: Boolean(user?.bannedAt),
      banReason: user?.bannedAt ? user.banReason || null : null,
    });
  } catch {
    return NextResponse.json({ banned: false, banReason: null });
  }
}

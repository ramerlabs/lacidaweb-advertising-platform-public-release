import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  message: z.string().min(1),
  status: z.enum(["IN_PROGRESS", "WAITING_CLIENT", "RESOLVED"]).default("IN_PROGRESS"),
});

type Params = { params: Promise<{ ticketId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const ticketId = (await params).ticketId;
    const body = schema.parse(await req.json());

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const message = await prisma.supportMessage.create({
      data: {
        ticketId,
        senderUserId: session.user.id,
        senderRole: "SUPPORT",
        message: body.message,
      },
    });

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: body.status },
    });

    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

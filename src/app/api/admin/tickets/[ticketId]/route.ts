import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "RESOLVED"]),
});

type Params = { params: Promise<{ ticketId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const ticketId = (await params).ticketId;
    const body = patchSchema.parse(await req.json());

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: body.status },
    });

    return NextResponse.json({ ticket: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const ticketId = (await params).ticketId;

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    await prisma.supportTicket.delete({ where: { id: ticketId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

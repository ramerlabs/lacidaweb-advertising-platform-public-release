import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAdminSupportReply } from "@/services/admin-notify";

const schema = z.object({
  teamId: z.string().min(1),
  message: z.string().min(1),
});

type Params = { params: Promise<{ ticketId: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const ticketId = (await params).ticketId;
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, teamId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const ticketId = (await params).ticketId;
    const body = schema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id);

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, teamId: body.teamId },
    });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const message = await prisma.supportMessage.create({
      data: {
        ticketId,
        senderUserId: session.user.id,
        senderRole: "CLIENT",
        message: body.message,
      },
    });

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: "OPEN",
        updatedAt: new Date(),
      },
    });

    notifyAdminSupportReply({
      teamId: body.teamId,
      userId: session.user.id,
      subject: ticket.subject,
      message: body.message,
      ticketId,
    });

    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reply";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

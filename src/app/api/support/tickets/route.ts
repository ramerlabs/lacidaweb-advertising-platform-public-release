import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requireTeamAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAdminSupportTicket } from "@/services/admin-notify";

const createSchema = z.object({
  teamId: z.string().min(1),
  subject: z.string().min(3),
  description: z.string().min(5),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const teamId = new URL(req.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });
    await requireTeamAccess(teamId, session.user.id);

    const tickets = await prisma.supportTicket.findMany({
      where: { teamId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = createSchema.parse(await req.json());
    await requireTeamAccess(body.teamId, session.user.id);

    const ticket = await prisma.supportTicket.create({
      data: {
        teamId: body.teamId,
        createdById: session.user.id,
        subject: body.subject,
        description: body.description,
        priority: body.priority,
        status: "OPEN",
        messages: {
          create: {
            senderUserId: session.user.id,
            senderRole: "CLIENT",
            message: body.description,
          },
        },
      },
      include: { messages: true },
    });

    notifyAdminSupportTicket({
      teamId: body.teamId,
      userId: session.user.id,
      subject: body.subject,
      priority: body.priority,
      ticketId: ticket.id,
    });

    return NextResponse.json({ ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create ticket";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

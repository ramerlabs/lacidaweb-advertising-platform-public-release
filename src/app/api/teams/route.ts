import { NextResponse } from "next/server";
import { requireSession, getUserTeams } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/utils";
import { ensureTeamZernioProfile } from "@/services/profiles";

export async function GET() {
  try {
    const session = await requireSession();
    const memberships = await getUserTeams(session.user.id);
    return NextResponse.json({
      teams: memberships.map((m) => ({
        id: m.team.id,
        name: m.team.name,
        slug: m.team.slug,
        role: m.role,
        zernioProfileId: m.team.zernioProfileId,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

const createSchema = z.object({
  name: z.string().min(2),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = createSchema.parse(await req.json());
    const baseSlug = slugify(body.name) || "team";
    let slug = baseSlug;
    let i = 1;
    while (await prisma.team.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    const team = await prisma.team.create({
      data: {
        name: body.name,
        slug,
        members: {
          create: { userId: session.user.id, role: "OWNER" },
        },
      },
    });

    try {
      await ensureTeamZernioProfile(team.id);
    } catch (error) {
      console.error("[teams] profile provision failed", error);
    }

    return NextResponse.json({ team });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create team failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

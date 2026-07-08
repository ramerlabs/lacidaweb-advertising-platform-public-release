import { NextResponse } from "next/server";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim().toLowerCase() || "";
    const bannedOnly = url.searchParams.get("banned") === "1";

    const users = await prisma.user.findMany({
      where: {
        ...(bannedOnly ? { bannedAt: { not: null } } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: bannedOnly ? { bannedAt: "desc" } : { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        bannedAt: true,
        banReason: true,
        createdAt: true,
        memberships: {
          orderBy: { createdAt: "asc" },
          include: {
            team: {
              include: {
                subscription: true,
                _count: { select: { connectedAccounts: true, posts: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      users: users.map((user) => {
        const primary = user.memberships[0];
        const team = primary?.team;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          bannedAt: user.bannedAt,
          banReason: user.banReason,
          createdAt: user.createdAt,
          team: team
            ? {
                id: team.id,
                name: team.name,
                slug: team.slug,
                aiBalanceCents: team.aiBalanceCents,
                connectedAccounts: team._count.connectedAccounts,
                posts: team._count.posts,
              }
            : null,
          subscription: team?.subscription
            ? {
                id: team.subscription.id,
                planId: team.subscription.planId,
                status: team.subscription.status,
                accountLimit: team.subscription.accountLimit,
                amount: team.subscription.amount,
                interval: team.subscription.interval,
                currentPeriodEnd: team.subscription.currentPeriodEnd,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "BANNED" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

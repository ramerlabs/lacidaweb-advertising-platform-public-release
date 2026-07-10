import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { requireActiveLicense } from "@/lib/license";
import type { MembershipRole } from "@prisma/client";

type SessionOpts = {
  /** Allow access before a platform license is activated (admin license UI only). */
  allowUnlicensed?: boolean;
};

export async function requireSession(opts?: SessionOpts) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if (session && "error" in session && session.error === "BANNED") {
      throw new Error("BANNED");
    }
    throw new Error("UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { bannedAt: true },
  });
  if (user?.bannedAt) {
    throw new Error("BANNED");
  }

  if (!opts?.allowUnlicensed) {
    await requireActiveLicense();
  }

  return session;
}

export async function getUserTeams(userId: string) {
  return prisma.teamMember.findMany({
    where: { userId },
    include: { team: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function requireTeamAccess(
  teamId: string,
  userId: string,
  roles?: MembershipRole[],
) {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    include: { team: true },
  });

  if (!membership) {
    throw new Error("FORBIDDEN");
  }

  if (roles && !roles.includes(membership.role)) {
    throw new Error("FORBIDDEN");
  }

  return membership;
}

export async function getActiveTeamId(userId: string, preferredTeamId?: string | null) {
  if (preferredTeamId) {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: preferredTeamId, userId } },
    });
    if (membership) return preferredTeamId;
  }

  const first = await prisma.teamMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return first?.teamId ?? null;
}

export { isPlatformAdminEmail } from "@/lib/platform-admin";

export async function requirePlatformAdmin(userId: string, opts?: SessionOpts) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!isPlatformAdminEmail(user?.email)) {
    throw new Error("FORBIDDEN");
  }

  if (!opts?.allowUnlicensed) {
    await requireActiveLicense();
  }

  return user;
}

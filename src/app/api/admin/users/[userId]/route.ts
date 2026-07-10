import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { sendPasswordResetEmail } from "@/services/email";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  accountType: z.enum(["ADVERTISER", "PUBLISHER"]).optional(),
  aiEnabled: z.boolean().optional(),
  aiBalanceCents: z.number().int().min(0).optional(),
  addAiCreditsCents: z.number().int().min(0).optional(),
  aiTokenBalance: z.number().int().min(0).optional(),
  addAiTokens: z.number().int().min(0).optional(),
  addAdWalletUsd: z.number().positive().max(1_000_000).optional(),
  setAdWalletUsd: z.number().min(0).max(1_000_000).optional(),
  teamId: z.string().min(1).optional(),
  subscriptionStatus: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"]).optional(),
  interval: z.enum(["MONTHLY", "YEARLY"]).optional(),
  banned: z.boolean().optional(),
  banReason: z.string().max(500).optional().nullable(),
  newPassword: z.string().min(8).optional(),
  sendPasswordEmail: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            team: { include: { subscription: true } },
          },
        },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const { userId } = await params;
    const body = updateSchema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { team: { include: { subscription: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (body.banned && userId === session.user.id) {
      return NextResponse.json({ error: "You cannot ban your own admin account" }, { status: 400 });
    }

    if (body.email && body.email.toLowerCase() !== user.email) {
      const taken = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
      if (taken) return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    let generatedPassword: string | undefined;
    let passwordHash: string | undefined;
    if (body.newPassword !== undefined || body.sendPasswordEmail) {
      generatedPassword = body.newPassword?.trim() || generateTemporaryPassword();
      passwordHash = await hashPassword(generatedPassword);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name?.trim() ?? undefined,
        email: body.email ? body.email.toLowerCase().trim() : undefined,
        accountType: body.accountType,
        passwordHash,
        bannedAt: body.banned === undefined ? undefined : body.banned ? new Date() : null,
        banReason:
          body.banned === undefined
            ? undefined
            : body.banned
              ? body.banReason?.trim() || "Banned by admin"
              : null,
      },
    });

    const team =
      (body.teamId
        ? user.memberships.find((m) => m.teamId === body.teamId)?.team
        : null) || user.memberships[0]?.team;

    let aiTokenBalance: number | undefined;
    let adWalletBalanceCents: number | undefined;
    if (
      team &&
      (body.aiTokenBalance !== undefined ||
        body.addAiTokens !== undefined ||
        body.aiEnabled !== undefined ||
        body.addAdWalletUsd !== undefined ||
        body.setAdWalletUsd !== undefined)
    ) {
      const current = await prisma.team.findUnique({
        where: { id: team.id },
        select: { aiTokenBalance: true, aiEnabled: true, adWalletBalanceCents: true },
      });
      const nextBalance =
        body.aiTokenBalance !== undefined
          ? body.aiTokenBalance
          : body.addAiTokens !== undefined
            ? (current?.aiTokenBalance || 0) + (body.addAiTokens || 0)
            : current?.aiTokenBalance || 0;

      let nextWallet = current?.adWalletBalanceCents ?? 0;
      if (body.setAdWalletUsd !== undefined) {
        nextWallet = Math.round(body.setAdWalletUsd * 100);
      } else if (body.addAdWalletUsd !== undefined) {
        nextWallet = nextWallet + Math.round(body.addAdWalletUsd * 100);
      }

      const updatedTeam = await prisma.team.update({
        where: { id: team.id },
        data: {
          aiTokenBalance:
            body.aiTokenBalance !== undefined || body.addAiTokens !== undefined
              ? nextBalance
              : undefined,
          aiEnabled: body.aiEnabled !== undefined ? body.aiEnabled : undefined,
          adWalletBalanceCents:
            body.addAdWalletUsd !== undefined || body.setAdWalletUsd !== undefined
              ? nextWallet
              : undefined,
        },
        select: { aiTokenBalance: true, aiEnabled: true, adWalletBalanceCents: true },
      });
      aiTokenBalance = updatedTeam.aiTokenBalance;
      adWalletBalanceCents = updatedTeam.adWalletBalanceCents;

      if (body.addAdWalletUsd !== undefined || body.setAdWalletUsd !== undefined) {
        const deltaCents =
          body.setAdWalletUsd !== undefined
            ? nextWallet - (current?.adWalletBalanceCents ?? 0)
            : Math.round((body.addAdWalletUsd || 0) * 100);
        if (deltaCents !== 0) {
          await prisma.walletTransaction.create({
            data: {
              teamId: team.id,
              type: deltaCents > 0 ? "TOP_UP" : "ADJUSTMENT",
              status: "COMPLETED",
              amountCents: Math.abs(deltaCents),
              balanceAfterCents: updatedTeam.adWalletBalanceCents,
              description:
                body.setAdWalletUsd !== undefined
                  ? `Admin set wallet balance to $${body.setAdWalletUsd.toFixed(2)}`
                  : `Admin top-up $${(body.addAdWalletUsd || 0).toFixed(2)}`,
              metadata: {
                kind: "ADMIN_WALLET",
                adminUserId: session.user.id,
                setUsd: body.setAdWalletUsd,
                addUsd: body.addAdWalletUsd,
              },
              completedAt: new Date(),
            },
          });
        }
      }
    }

    let emailResult: { ok: boolean; method?: string } | null = null;
    if (generatedPassword && body.sendPasswordEmail !== false) {
      emailResult = await sendPasswordResetEmail({
        to: updated.email,
        name: updated.name,
        newPassword: generatedPassword,
        resetByAdmin: true,
      });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        accountType: updated.accountType,
        bannedAt: updated.bannedAt,
        banReason: updated.banReason,
      },
      aiTokenBalance,
      adWalletBalanceCents,
      newPassword:
        generatedPassword && (body.sendPasswordEmail === false || !emailResult?.ok)
          ? generatedPassword
          : undefined,
      emailSent: emailResult?.ok ?? false,
      message: body.banned
        ? "User banned"
        : body.banned === false
          ? "User unbanned"
          : generatedPassword
            ? emailResult?.ok
              ? "Password updated and emailed to user"
              : "Password updated (email failed — use the returned password)"
            : "User updated",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const { userId } = await params;

    if (userId === session.user.id) {
      return NextResponse.json({ error: "You cannot delete your own admin account" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({
      ok: true,
      deletedUserId: userId,
      message: `Deleted user ${user.email}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

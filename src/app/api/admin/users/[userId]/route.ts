import { NextResponse } from "next/server";
import { z } from "zod";
import type { SubscriptionStatus } from "@prisma/client";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanById, plans } from "@/lib/pricing";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { sendPasswordResetEmail } from "@/services/email";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  planId: z.enum(["starter", "growth", "scale"]).optional(),
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

    const team = user.memberships[0]?.team;
    let subscription = team?.subscription || null;

    if (team && (body.planId || body.subscriptionStatus || body.interval)) {
      const plan = getPlanById(body.planId || subscription?.planId || plans[0].id);
      const interval = body.interval || subscription?.interval || "MONTHLY";
      const amount = interval === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice;
      const status = (body.subscriptionStatus ||
        subscription?.status ||
        "TRIAL") as SubscriptionStatus;

      if (subscription) {
        subscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            planId: plan.id,
            accountLimit: plan.accountLimit,
            interval,
            amount,
            status,
            currentPeriodStart:
              status === "ACTIVE" && subscription.status !== "ACTIVE" ? new Date() : undefined,
            currentPeriodEnd:
              status === "ACTIVE"
                ? new Date(
                    Date.now() +
                      (interval === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000,
                  )
                : status === "CANCELED"
                  ? subscription.currentPeriodEnd
                  : undefined,
          },
        });
      } else {
        subscription = await prisma.subscription.create({
          data: {
            teamId: team.id,
            planId: plan.id,
            accountLimit: plan.accountLimit,
            interval,
            amount,
            status,
            currentPeriodStart: new Date(),
            currentPeriodEnd:
              status === "ACTIVE"
                ? new Date(
                    Date.now() +
                      (interval === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000,
                  )
                : null,
          },
        });
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
        bannedAt: updated.bannedAt,
        banReason: updated.banReason,
      },
      subscription,
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

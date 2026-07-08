import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "@/lib/password";
import { sendPasswordChangedEmail, sendPasswordResetEmail } from "@/services/email";

const resetSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8).optional(),
  sendEmail: z.boolean().optional(),
});

const changeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const body = resetSchema.parse(await req.json());

    const email = body.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newPassword = body.newPassword?.trim() || generateTemporaryPassword();
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    let emailResult = { ok: false, method: "log-fallback" as const };
    if (body.sendEmail !== false) {
      emailResult = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        newPassword,
        resetByAdmin: true,
      });
    }

    return NextResponse.json({
      ok: true,
      email: user.email,
      newPassword: body.sendEmail === false ? newPassword : undefined,
      emailSent: emailResult.ok,
      emailMethod: emailResult.method,
      message:
        emailResult.ok
          ? "Password reset. The user was emailed their new password."
          : "Password reset. Email could not be sent — share the new password manually.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const body = changeSchema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Password login not available" }, { status: 400 });
    }

    const valid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.newPassword) },
    });

    const emailResult = await sendPasswordChangedEmail({ to: user.email, name: user.name });

    return NextResponse.json({
      ok: true,
      message: "Your admin password was updated",
      emailSent: emailResult.ok,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

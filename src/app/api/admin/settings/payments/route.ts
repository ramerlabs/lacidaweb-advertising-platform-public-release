import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { getPaymentSettings, updatePaymentSettings } from "@/lib/payment-settings";

const schema = z.object({
  usdtEnabled: z.boolean().optional(),
  paypalEnabled: z.boolean().optional(),
  gcashEnabled: z.boolean().optional(),
  usdtTrc20Wallet: z.string().optional(),
  usdtInstructions: z.string().optional(),
  paypalInstructions: z.string().optional(),
  gcashInstructions: z.string().optional(),
  usdtPerUsd: z.number().positive().nullable().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const settings = await getPaymentSettings();
    return NextResponse.json({ settings });
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
    const body = schema.parse(await req.json());
    const settings = await updatePaymentSettings(body);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

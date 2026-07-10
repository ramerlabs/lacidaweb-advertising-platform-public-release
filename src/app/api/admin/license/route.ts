import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import {
  activateLicense,
  deactivateLicense,
  getLicenseStatus,
  validateLicense,
} from "@/lib/license";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const status = await getLicenseStatus();
    return NextResponse.json({ license: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

const schema = z.object({
  action: z.enum(["activate", "validate", "deactivate"]),
  licenseKey: z.string().min(8).max(200).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    await requirePlatformAdmin(session.user.id);
    const body = schema.parse(await req.json());

    let license;
    if (body.action === "activate") {
      if (!body.licenseKey?.trim()) {
        return NextResponse.json({ error: "License key is required" }, { status: 400 });
      }
      license = await activateLicense(body.licenseKey);
    } else if (body.action === "validate") {
      license = await validateLicense(true);
    } else {
      license = await deactivateLicense();
    }

    return NextResponse.json({
      license,
      message:
        body.action === "activate"
          ? "License activated"
          : body.action === "validate"
            ? "License validated"
            : "License deactivated",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

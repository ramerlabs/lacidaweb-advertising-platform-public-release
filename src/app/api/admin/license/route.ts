import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, requireSession } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-error";
import {
  activateLicense,
  deactivateLicense,
  getLicenseStatus,
  validateLicense,
} from "@/lib/license";

export async function GET() {
  try {
    const session = await requireSession({ allowUnlicensed: true });
    await requirePlatformAdmin(session.user.id, { allowUnlicensed: true });
    const status = await getLicenseStatus();
    return NextResponse.json({ license: status });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const schema = z.object({
  action: z.enum(["activate", "validate", "deactivate"]),
  licenseKey: z.string().min(8).max(200).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession({ allowUnlicensed: true });
    await requirePlatformAdmin(session.user.id, { allowUnlicensed: true });
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
    return apiErrorResponse(error);
  }
}

import { NextResponse } from "next/server";

/** Map thrown auth/license errors to HTTP responses. */
export function apiErrorResponse(error: unknown, fallback = "Failed") {
  const message = error instanceof Error ? error.message : fallback;
  const status =
    message === "UNAUTHORIZED"
      ? 401
      : message === "FORBIDDEN" || message === "BANNED"
        ? 403
        : message === "LICENSE_REQUIRED"
          ? 402
          : 400;

  if (message === "LICENSE_REQUIRED") {
    return NextResponse.json(
      {
        error: "LICENSE_REQUIRED",
        code: "LICENSE_REQUIRED",
        message:
          "This lacidaweb deployment is not licensed. An admin must activate a license key first.",
      },
      { status },
    );
  }

  return NextResponse.json({ error: message }, { status });
}

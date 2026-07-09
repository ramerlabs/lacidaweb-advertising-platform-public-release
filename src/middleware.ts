import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getDashboardHome,
  isAdvertiserDashboardPath,
  isPublisherDashboardPath,
  parseAccountType,
} from "@/lib/account-type";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (path.startsWith("/admin")) {
    if (!token || token.banned) {
      const login = new URL("/login/admin", req.url);
      login.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(login);
    }
    if (!isPlatformAdminEmail(token.email as string | undefined)) {
      return NextResponse.redirect(new URL("/login/advertiser", req.url));
    }
    return NextResponse.next();
  }

  if (!token || token.banned) {
    const login = new URL("/login/advertiser", req.url);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  const accountType = parseAccountType(String(token.accountType)) || "ADVERTISER";
  const home = getDashboardHome(accountType);

  if (path === "/dashboard") {
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (accountType === "PUBLISHER" && isAdvertiserDashboardPath(path)) {
    return NextResponse.redirect(new URL("/dashboard/publisher", req.url));
  }

  if (accountType === "ADVERTISER" && isPublisherDashboardPath(path)) {
    return NextResponse.redirect(new URL("/dashboard/advertiser", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

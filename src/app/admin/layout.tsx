import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isPlatformAdminEmail } from "@/lib/auth";
import { isPlatformLicensed } from "@/lib/license";
import { AdminShell } from "@/components/admin/admin-shell";
import { LicenseRequiredBanner } from "@/components/admin/license-required-banner";

const LICENSE_PATH = "/admin/settings/license";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login/admin");
  }
  if (!isPlatformAdminEmail(session.user.email)) {
    redirect("/login/advertiser?error=admin_forbidden");
  }

  const licensed = await isPlatformLicensed();
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") || "";

  // Only redirect when we know the path (middleware sets x-pathname).
  // Empty path: show banner and let the License page render without a loop.
  if (
    !licensed &&
    pathname &&
    pathname !== LICENSE_PATH &&
    !pathname.startsWith(`${LICENSE_PATH}/`)
  ) {
    redirect(LICENSE_PATH);
  }

  return (
    <AdminShell email={session.user.email || ""} licensed={licensed}>
      {!licensed ? <LicenseRequiredBanner /> : null}
      {children}
    </AdminShell>
  );
}

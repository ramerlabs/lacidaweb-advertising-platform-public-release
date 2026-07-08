import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isPlatformAdminEmail } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if (!isPlatformAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  return <AdminShell email={session.user.email || ""}>{children}</AdminShell>;
}

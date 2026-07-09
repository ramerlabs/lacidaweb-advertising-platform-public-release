import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isPlatformAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userNeedsOnboarding } from "@/lib/auth-options";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { TeamProvider } from "@/components/dashboard/team-provider";
import type { ClientAccountType } from "@/lib/account-type";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if ((session as { error?: string } | null)?.error === "BANNED") {
      redirect("/login?error=banned");
    }
    redirect("/login");
  }

  const banned = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { bannedAt: true, banReason: true, accountType: true },
  });
  if (banned?.bannedAt) {
    const reason = banned.banReason ? `&reason=${encodeURIComponent(banned.banReason)}` : "";
    redirect(`/login?error=banned${reason}`);
  }

  if (await userNeedsOnboarding(session.user.id)) {
    redirect("/onboarding");
  }

  const isAdmin = isPlatformAdminEmail(session.user.email);
  const accountType: ClientAccountType = banned?.accountType ?? session.user.accountType ?? "ADVERTISER";

  return (
    <TeamProvider>
      <DashboardShell email={session.user.email || ""} isAdmin={isAdmin} accountType={accountType}>
        {children}
      </DashboardShell>
    </TeamProvider>
  );
}

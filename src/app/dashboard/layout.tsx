import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isPlatformAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TeamProvider } from "@/components/dashboard/team-provider";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { Button } from "@/components/ui/button";

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
    select: { bannedAt: true, banReason: true },
  });
  if (banned?.bannedAt) {
    const reason = banned.banReason ? `&reason=${encodeURIComponent(banned.banReason)}` : "";
    redirect(`/login?error=banned${reason}`);
  }

  const isAdmin = isPlatformAdminEmail(session.user.email);

  return (
    <TeamProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b bg-white/70 px-6 py-4 backdrop-blur">
            <div>
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="font-medium">{session.user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin">Admin portal</Link>
                </Button>
              ) : null}
              <TeamSwitcher />
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </TeamProvider>
  );
}

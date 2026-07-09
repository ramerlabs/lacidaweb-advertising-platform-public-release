"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { WalletBalanceBadge } from "@/components/dashboard/wallet-balance-badge";
import { Button } from "@/components/ui/button";
import type { ClientAccountType } from "@/lib/account-type";
import { accountTypeLabel } from "@/lib/account-type";

export function DashboardNavbar({
  email,
  isAdmin,
  accountType,
  onMenuOpen,
}: {
  email: string;
  isAdmin: boolean;
  accountType: ClientAccountType;
  onMenuOpen: () => void;
}) {
  const showWallet = accountType === "ADVERTISER";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 border-zinc-300 md:hidden dark:border-zinc-700"
            onClick={onMenuOpen}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {accountTypeLabel(accountType)}
            </p>
            <p className="truncate text-sm font-semibold">{email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {showWallet ? <WalletBalanceBadge /> : null}
          {isAdmin ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden border-zinc-300 sm:inline-flex dark:border-zinc-700"
            >
              <Link href="/admin">Admin panel</Link>
            </Button>
          ) : null}
          <Button size="icon" variant="ghost" className="hidden h-9 w-9 sm:inline-flex" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <TeamSwitcher />
        </div>
      </div>
    </header>
  );
}

export function DashboardShell({
  email,
  isAdmin,
  accountType,
  children,
}: {
  email: string;
  isAdmin: boolean;
  accountType: ClientAccountType;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="hidden w-[260px] shrink-0 border-r border-zinc-800 md:block">
        <Sidebar dark accountType={accountType} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-zinc-800 bg-[hsl(var(--sidebar))] shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <span className="text-sm font-medium text-zinc-300">Menu</span>
              <Button
                size="sm"
                variant="ghost"
                className="text-zinc-400 hover:text-white"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar dark accountType={accountType} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardNavbar
          email={email}
          isAdmin={isAdmin}
          accountType={accountType}
          onMenuOpen={() => setMobileOpen(true)}
        />
        <main className="flex-1 bg-grid p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

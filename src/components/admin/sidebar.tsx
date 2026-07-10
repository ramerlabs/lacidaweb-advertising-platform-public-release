"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CreditCard,
  Headset,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Palette,
  PenSquare,
  Plug,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { SiteLogo } from "@/components/branding/site-logo";
import { ThemeSelect } from "@/components/theme-toggle";

const platformLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone, countKey: "pendingReview" as const },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, countKey: "pendingPayments" as const },
  { href: "/admin/payouts", label: "Publisher payouts", icon: Wallet },
  { href: "/admin/support", label: "Support", icon: Headset, countKey: "openTickets" as const },
];

const settingsLinks = [
  { href: "/admin/settings/payments", label: "Payment gateways", icon: Wallet },
  { href: "/admin/settings/ads", label: "Publisher ads", icon: Megaphone },
  { href: "/admin/settings/license", label: "License", icon: KeyRound },
  { href: "/admin/settings/branding", label: "Branding", icon: Palette },
  { href: "/admin/settings/faqs", label: "FAQs", icon: HelpCircle },
  { href: "/admin/settings/security", label: "Security", icon: Shield },
  { href: "/admin/settings/integrations", label: "Integrations", icon: Plug },
];

type Counts = {
  openTickets: number;
  pendingPayments: number;
  pendingReview: number;
};

export function AdminSidebar({
  onNavigate,
  licensed = true,
}: {
  onNavigate?: () => void;
  licensed?: boolean;
}) {
  const pathname = usePathname();
  const { branding } = useSiteBranding();
  const [counts, setCounts] = useState<Counts>({
    openTickets: 0,
    pendingPayments: 0,
    pendingReview: 0,
  });

  useEffect(() => {
    if (!licensed) return;
    async function load() {
      const [notifRes, overviewRes] = await Promise.all([
        fetch("/api/admin/notifications/count"),
        fetch("/api/admin/overview"),
      ]);
      const notif = await notifRes.json();
      const overview = await overviewRes.json();
      setCounts({
        openTickets: notifRes.ok ? notif.openTickets || 0 : 0,
        pendingPayments: notifRes.ok ? notif.pendingPayments || 0 : 0,
        pendingReview: overviewRes.ok ? overview.pendingReview || 0 : 0,
      });
    }
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [licensed]);

  function renderLink(link: (typeof platformLinks)[number]) {
    const Icon = link.icon;
    const active = link.exact
      ? pathname === link.href
      : pathname === link.href || pathname.startsWith(`${link.href}/`);
    const count = link.countKey ? counts[link.countKey] : 0;

    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
          active
            ? "bg-cyan-500/15 text-cyan-400 shadow-[inset_3px_0_0_0] shadow-cyan-400"
            : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100",
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4" />
          {link.label}
        </span>
        {count > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1.5 text-xs font-bold text-zinc-950">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    );
  }

  const visibleSettings = licensed
    ? settingsLinks
    : settingsLinks.filter((link) => link.href === "/admin/settings/license");

  return (
    <aside className="flex h-full flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="border-b border-zinc-800 px-5 py-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-500">Admin</div>
        <div className="mt-2">
          <SiteLogo branding={branding} href="/admin" onDark className="h-8 w-auto" />
        </div>
        <p className="mt-1 text-xs text-zinc-500">lacidaweb control panel</p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        {licensed ? (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              Platform
            </p>
            {platformLinks.map(renderLink)}
          </div>
        ) : null}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-600">Settings</p>
          {visibleSettings.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-cyan-500/15 text-cyan-400 shadow-[inset_3px_0_0_0] shadow-cyan-400"
                    : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="space-y-1 border-t border-zinc-800 p-3">
        <div className="flex items-center justify-between gap-2 px-3 py-1">
          <span className="text-xs text-zinc-500">Theme</span>
          <ThemeSelect className="w-28" />
        </div>
        {licensed ? (
          <>
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <Link href="/dashboard/advertiser" onClick={onNavigate}>
                <Megaphone className="h-4 w-4" />
                Advertiser dashboard
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <Link href="/dashboard/publisher" onClick={onNavigate}>
                <PenSquare className="h-4 w-4" />
                Publisher dashboard
              </Link>
            </Button>
          </>
        ) : null}
        <Button
          variant="ghost"
          className="w-full justify-start text-zinc-400 hover:bg-zinc-800 hover:text-white"
          onClick={() => signOut({ callbackUrl: "/login/admin" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

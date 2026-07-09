"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CreditCard,
  Headset,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Palette,
  Plug,
  HelpCircle,
  ScrollText,
  Shield,
  Settings,
  Users,
  Wallet,
  Sparkles,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { SiteLogo } from "@/components/branding/site-logo";
import { ThemeSelect } from "@/components/theme-toggle";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, countKey: "pendingPayments" as const },
  { href: "/admin/support", label: "Support", icon: Headset, countKey: "openTickets" as const },
  { href: "/admin/settings/payments", label: "Payment details", icon: Wallet },
  { href: "/admin/settings/branding", label: "Branding", icon: Palette },
  { href: "/admin/settings/ai", label: "AI & tokens", icon: Sparkles },
  { href: "/admin/settings/ads", label: "Ads", icon: Megaphone },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/settings/faqs", label: "FAQs", icon: HelpCircle },
  { href: "/admin/settings/security", label: "Security", icon: Shield },
  { href: "/admin/settings/integrations", label: "Integrations", icon: Plug },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { branding } = useSiteBranding();
  const [counts, setCounts] = useState({ openTickets: 0, pendingPayments: 0 });

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/notifications/count");
      const data = await res.json();
      if (res.ok) {
        setCounts({
          openTickets: data.openTickets || 0,
          pendingPayments: data.pendingPayments || 0,
        });
      }
    }
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="border-b px-5 py-5">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Admin</div>
        <div className="mt-2">
          <SiteLogo branding={branding} textClassName="text-lg font-semibold" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Platform owner panel</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const count = link.countKey ? counts[link.countKey] : 0;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {link.label}
              </span>
              {count > 0 ? (
                <span
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                    active ? "bg-white text-primary" : "bg-primary text-primary-foreground",
                  )}
                >
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t p-3">
        <div className="flex items-center justify-between gap-2 px-3 py-1">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeSelect className="w-28" />
        </div>
        <Button asChild variant="ghost" className="w-full justify-start">
          <Link href="/dashboard">
            <Settings className="h-4 w-4" />
            Client dashboard
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

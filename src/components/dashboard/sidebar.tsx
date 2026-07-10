"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Code2,
  CreditCard,
  Headset,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Megaphone,
  Plus,
  Settings,
  Wallet,
  Globe,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { ClientAccountType } from "@/lib/account-type";
import { accountTypeLabel } from "@/lib/account-type";
import { Button } from "@/components/ui/button";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { SiteLogo } from "@/components/branding/site-logo";
import { ThemeSelect } from "@/components/theme-toggle";

const advertiserLinks = [
  { href: "/dashboard/advertiser", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/support", label: "Support", icon: Headset },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const publisherLinks = [
  { href: "/dashboard/publisher", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/publisher/templates", label: "Ad templates", icon: LayoutTemplate },
  { href: "/dashboard/publisher/sites", label: "Websites & embed", icon: Code2 },
  { href: "/dashboard/publisher/performance", label: "Performance", icon: BarChart3 },
  { href: "/dashboard/publisher/earnings", label: "Earnings", icon: Wallet },
  { href: "/dashboard/support", label: "Support", icon: Headset },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  onNavigate,
  dark,
  accountType,
}: {
  onNavigate?: () => void;
  dark?: boolean;
  accountType: ClientAccountType;
}) {
  const pathname = usePathname();
  const { branding } = useSiteBranding();
  const mode = accountType === "PUBLISHER" ? "publisher" : "advertiser";
  const navLinks = mode === "publisher" ? publisherLinks : advertiserLinks;
  const label = accountTypeLabel(accountType);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    if (href === "/dashboard/advertiser" || href === "/dashboard/publisher") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const accent = mode === "publisher" ? "emerald" : "cyan";

  return (
    <aside
      className={cn(
        "flex h-full flex-col",
        dark ? "bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]" : "bg-card",
      )}
    >
      <div className={cn("border-b px-5 py-5", dark ? "border-zinc-800" : "")}>
        <SiteLogo branding={branding} href={mode === "publisher" ? "/dashboard/publisher" : "/dashboard/advertiser"} onDark className="h-8 w-auto" />
        <p className={cn("mt-2 text-xs font-medium uppercase tracking-wider", dark ? "text-zinc-500" : "text-muted-foreground")}>
          {label}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                dark
                  ? active
                    ? accent === "emerald"
                      ? "bg-emerald-500/15 text-emerald-400 shadow-[inset_3px_0_0_0] shadow-emerald-400"
                      : "bg-cyan-500/15 text-cyan-400 shadow-[inset_3px_0_0_0] shadow-cyan-400"
                    : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className={cn("space-y-2 border-t p-3", dark ? "border-zinc-800" : "")}>
        {mode === "advertiser" ? (
          <Button
            asChild
            className={cn("w-full justify-start gap-2", dark && "bg-cyan-500 text-zinc-950 hover:bg-cyan-400")}
            size="sm"
          >
            <Link href="/dashboard/campaigns/new" onClick={onNavigate}>
              <Plus className="h-4 w-4" />
              New campaign
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            className={cn(
              "w-full justify-start gap-2",
              dark && "bg-emerald-500 text-zinc-950 hover:bg-emerald-400",
            )}
            size="sm"
          >
            <Link href="/dashboard/publisher/sites" onClick={onNavigate}>
              <Globe className="h-4 w-4" />
              Add website
            </Link>
          </Button>
        )}
        <div className="flex items-center justify-between gap-2 px-1">
          <span className={cn("text-xs", dark ? "text-zinc-500" : "text-muted-foreground")}>Theme</span>
          <ThemeSelect className="w-28" />
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start",
            dark && "text-zinc-400 hover:bg-zinc-800 hover:text-white",
          )}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  Headset,
  Inbox,
  LayoutDashboard,
  Link2,
  LogOut,
  PenSquare,
  Settings,
  Shield,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { SiteLogo } from "@/components/branding/site-logo";
import { ThemeSelect } from "@/components/theme-toggle";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/compose", label: "Compose", icon: PenSquare },
  { href: "/dashboard/accounts", label: "Accounts", icon: Link2 },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/support", label: "Support", icon: Headset },
  { href: "/dashboard/automations", label: "Automations", icon: Shield },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { branding } = useSiteBranding();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="border-b px-5 py-5">
        <SiteLogo branding={branding} />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
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
      <div className="space-y-2 border-t p-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeSelect className="w-28" />
        </div>
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

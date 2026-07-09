"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu, X } from "lucide-react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Button } from "@/components/ui/button";

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="hidden w-[260px] shrink-0 border-r border-zinc-800 md:block">
        <AdminSidebar />
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
              <span className="text-sm font-medium text-zinc-300">Admin menu</span>
              <Button
                size="sm"
                variant="ghost"
                className="text-zinc-400 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <AdminSidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 border-zinc-300 md:hidden dark:border-zinc-700"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  lacidaweb admin
                </p>
                <p className="text-sm font-semibold">{email}</p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="border-zinc-300 dark:border-zinc-700">
              <Link href="/login/advertiser">
                <ArrowLeft className="h-4 w-4" />
                Client login
              </Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 bg-grid p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

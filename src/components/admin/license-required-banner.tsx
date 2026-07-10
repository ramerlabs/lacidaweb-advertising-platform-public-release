"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LicenseRequiredBanner() {
  return (
    <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              License required
            </p>
            <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/70">
              Activate your lacidaweb license key to unlock campaigns, ads, wallets, and the rest of
              the admin panel.
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0 bg-amber-600 text-white hover:bg-amber-500">
          <Link href="/admin/settings/license">Enter license key</Link>
        </Button>
      </div>
    </div>
  );
}

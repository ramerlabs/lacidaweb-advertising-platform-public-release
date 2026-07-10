"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WalletBalanceBadge({ className }: { className?: string }) {
  const { teamId } = useTeam();
  const [balanceUsd, setBalanceUsd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!teamId) {
      setLoading(false);
      setBalanceUsd(null);
      return;
    }

    setLoading(true);
    fetch(`/api/billing/ad-wallet?teamId=${encodeURIComponent(teamId)}`)
      .then((res) => res.json())
      .then((data) => {
        setBalanceUsd(typeof data.adWalletBalanceUsd === "string" ? data.adWalletBalanceUsd : "0.00");
      })
      .catch(() => setBalanceUsd("0.00"))
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => {
    let cancelled = false;
    if (!teamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/billing/ad-wallet?teamId=${encodeURIComponent(teamId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setBalanceUsd(typeof data.adWalletBalanceUsd === "string" ? data.adWalletBalanceUsd : "0.00");
      })
      .catch(() => {
        if (!cancelled) setBalanceUsd("0.00");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  useEffect(() => {
    function onFocus() {
      refresh();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") refresh();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Link
        href="/dashboard/wallet"
        className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow-sm transition hover:border-cyan-500/50 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <Wallet className="h-4 w-4 text-cyan-500" />
        <span className="hidden text-muted-foreground sm:inline">Wallet</span>
        <span className="font-semibold tabular-nums text-foreground">
          {loading || balanceUsd === null ? "—" : `$${balanceUsd}`}
        </span>
      </Link>
      <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
        <Link href="/dashboard/wallet">
          <Plus className="h-4 w-4" />
          Top up
        </Link>
      </Button>
    </div>
  );
}

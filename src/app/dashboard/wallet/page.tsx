"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, Wallet } from "lucide-react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PAYMENT_METHODS = [
  { id: "USDT", label: "USDT", description: "ERC-20 / TRC-20 crypto payments" },
  { id: "GCASH", label: "GCash", description: "Philippine mobile wallet" },
  { id: "PAYPAL", label: "PayPal", description: "PayPal balance or card" },
  { id: "US_BANK", label: "US Bank (ACH)", description: "Bank transfer via Stripe" },
] as const;

export default function WalletPage() {
  const { teamId } = useTeam();
  const [balanceUsd, setBalanceUsd] = useState("0.00");
  const [topUpUsd, setTopUpUsd] = useState(25);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    fetch(`/api/billing/ad-wallet?teamId=${encodeURIComponent(teamId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.adWalletBalanceUsd === "string") setBalanceUsd(data.adWalletBalanceUsd);
        if (typeof data.adWalletTopUpUsd === "number") setTopUpUsd(data.adWalletTopUpUsd);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [teamId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">
          Fund your lacidaweb balance before running ad campaigns.
        </p>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-violet-500/10 via-transparent to-blue-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            Available balance
          </CardTitle>
          <CardDescription>Used for campaign spend after admin approval.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold tabular-nums tracking-tight">
            {loading ? "—" : `$${balanceUsd}`}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">USD wallet balance</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {PAYMENT_METHODS.map((method) => (
          <Card key={method.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{method.label}</CardTitle>
              <CardDescription>{method.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/dashboard/billing?topup=${method.id.toLowerCase()}`}>
                  <CreditCard className="h-4 w-4" />
                  Top up ${topUpUsd} via {method.label}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction history</CardTitle>
          <CardDescription>
            Full wallet ledger with top-ups and ad spend arrives in Step 5.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No wallet transactions recorded yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}

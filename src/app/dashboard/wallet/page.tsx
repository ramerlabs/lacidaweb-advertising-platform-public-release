"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, Wallet } from "lucide-react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_ENABLED_METHODS,
  type ClientPaymentMethod,
  type EnabledPaymentMethods,
} from "@/lib/payment-methods";

const QUICK_AMOUNTS = [25, 50, 100, 250];

type LedgerTx = {
  id: string;
  type: string;
  status: string;
  amountUsd: string;
  description: string | null;
  createdAt: string;
};

export default function WalletPage() {
  const { teamId } = useTeam();
  const [balanceUsd, setBalanceUsd] = useState("0.00");
  const [minTopUpUsd, setMinTopUpUsd] = useState(25);
  const [topUpAmount, setTopUpAmount] = useState("25");
  const [loading, setLoading] = useState(true);
  const [toppingUp, setToppingUp] = useState(false);
  const [status, setStatus] = useState("");
  const [enabledMethods, setEnabledMethods] = useState<EnabledPaymentMethods>(DEFAULT_ENABLED_METHODS);
  const [ledger, setLedger] = useState<LedgerTx[]>([]);

  const amountUsd = useMemo(() => {
    const n = Number(topUpAmount);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }, [topUpAmount]);

  async function load() {
    if (!teamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [walletRes, methodsRes, ledgerRes] = await Promise.all([
      fetch(`/api/billing/ad-wallet?teamId=${encodeURIComponent(teamId)}`),
      fetch("/api/billing/payment-methods"),
      fetch(`/api/billing/wallet-transactions?teamId=${encodeURIComponent(teamId)}`),
    ]);
    const walletData = await walletRes.json();
    const methodsData = await methodsRes.json();
    const ledgerData = await ledgerRes.json();
    if (walletRes.ok) {
      if (typeof walletData.adWalletBalanceUsd === "string") setBalanceUsd(walletData.adWalletBalanceUsd);
      const min = Number(walletData.minTopUpUsd || walletData.adWalletTopUpUsd || 25);
      if (Number.isFinite(min) && min > 0) {
        setMinTopUpUsd(min);
        setTopUpAmount(String(min));
      }
    }
    if (methodsRes.ok && methodsData.methods) setEnabledMethods(methodsData.methods);
    if (ledgerRes.ok) setLedger(ledgerData.transactions || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function topUp(method: ClientPaymentMethod) {
    if (!teamId) return;
    if (amountUsd < minTopUpUsd) {
      setStatus(`Minimum top-up is $${minTopUpUsd.toFixed(2)}.`);
      return;
    }
    setToppingUp(true);
    setStatus("");
    const res = await fetch("/api/billing/ad-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, method, amountUsd }),
    });
    const data = await res.json();
    setToppingUp(false);
    if (!res.ok) {
      setStatus(data.error || "Could not start top-up");
      return;
    }
    window.location.href = `/dashboard/billing?topup=${method.toLowerCase()}`;
  }

  const methods: Array<{ id: ClientPaymentMethod; label: string; description: string; enabled: boolean }> = [
    { id: "USDT", label: "USDT", description: "ERC-20 / TRC-20 crypto", enabled: enabledMethods.USDT },
    { id: "GCASH", label: "GCash", description: "Philippine mobile wallet", enabled: enabledMethods.GCASH },
    { id: "PAYPAL", label: "PayPal", description: "PayPal balance or card", enabled: enabledMethods.PAYPAL },
    { id: "US_BANK", label: "US Bank (ACH)", description: "Bank transfer", enabled: enabledMethods.US_BANK },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">
          Top up your lacidaweb balance (minimum ${minTopUpUsd.toFixed(2)}) before running campaigns.
        </p>
      </div>

      <Card className="overflow-hidden border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-cyan-500" />
            Available balance
          </CardTitle>
          <CardDescription>
            Reserved when you submit a campaign. Refunded if admin rejects. Transaction logs expire after 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold tabular-nums tracking-tight">
            {loading ? "—" : `$${balanceUsd}`}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">USD wallet balance</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top up</CardTitle>
          <CardDescription>No subscription — pay only what you add to your wallet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet-amount">Amount (USD)</Label>
            <Input
              id="wallet-amount"
              type="number"
              min={minTopUpUsd}
              step="1"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={amountUsd === n ? "default" : "outline"}
                  onClick={() => setTopUpAmount(String(Math.max(minTopUpUsd, n)))}
                >
                  ${n}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {methods
              .filter((m) => m.enabled)
              .map((method) => (
                <Button
                  key={method.id}
                  variant="outline"
                  className="h-auto justify-start gap-3 px-4 py-3"
                  disabled={toppingUp}
                  onClick={() => topUp(method.id)}
                >
                  <CreditCard className="h-4 w-4 shrink-0" />
                  <span className="text-left">
                    <span className="block font-medium">
                      ${amountUsd.toFixed(2)} via {method.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">{method.description}</span>
                  </span>
                </Button>
              ))}
          </div>
          {methods.every((m) => !m.enabled) ? (
            <p className="text-sm text-muted-foreground">No payment methods are enabled yet.</p>
          ) : null}
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          <p className="text-xs text-muted-foreground">
            Or continue from{" "}
            <Link href="/dashboard/billing" className="underline underline-offset-2">
              Billing
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction log</CardTitle>
          <CardDescription>
            Top-ups, campaign reserves, refunds, AI token purchases, and ad spend. Entries older than 7 days are removed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wallet transactions yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {ledger.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-start justify-between gap-3 border-b pb-2 last:border-0"
                >
                  <span>
                    <span className="font-medium">{tx.type.replace(/_/g, " ")}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {tx.description || tx.status}
                    </span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums text-muted-foreground">
                    ${tx.amountUsd}
                    <span className="mt-0.5 block text-xs">
                      {new Date(tx.createdAt).toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

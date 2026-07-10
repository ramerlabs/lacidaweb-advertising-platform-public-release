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

export default function WalletPage() {
  const { teamId } = useTeam();
  const [balanceUsd, setBalanceUsd] = useState("0.00");
  const [minTopUpUsd, setMinTopUpUsd] = useState(25);
  const [topUpAmount, setTopUpAmount] = useState("25");
  const [loading, setLoading] = useState(true);
  const [toppingUp, setToppingUp] = useState(false);
  const [status, setStatus] = useState("");
  const [enabledMethods, setEnabledMethods] = useState<EnabledPaymentMethods>(DEFAULT_ENABLED_METHODS);
  const [transactions, setTransactions] = useState<
    Array<{ id: string; type: string; amountCents: number; description: string | null; createdAt: string }>
  >([]);

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
    const [walletRes, methodsRes, payRes] = await Promise.all([
      fetch(`/api/billing/ad-wallet?teamId=${encodeURIComponent(teamId)}`),
      fetch("/api/billing/payment-methods"),
      fetch(`/api/billing/payments?teamId=${encodeURIComponent(teamId)}`),
    ]);
    const walletData = await walletRes.json();
    const methodsData = await methodsRes.json();
    const payData = await payRes.json();
    if (walletRes.ok) {
      if (typeof walletData.adWalletBalanceUsd === "string") setBalanceUsd(walletData.adWalletBalanceUsd);
      const min = Number(walletData.minTopUpUsd || walletData.adWalletTopUpUsd || 25);
      if (Number.isFinite(min) && min > 0) {
        setMinTopUpUsd(min);
        setTopUpAmount(String(min));
      }
    }
    if (methodsRes.ok && methodsData.methods) setEnabledMethods(methodsData.methods);
    if (payRes.ok) {
      setTransactions(
        (payData.payments || [])
          .filter((p: { purpose?: string }) => p.purpose === "AD_WALLET")
          .slice(0, 20)
          .map((p: { id: string; amount: number; status: string; method: string; createdAt: string }) => ({
            id: p.id,
            type: p.status,
            amountCents: Math.round(p.amount * 100),
            description: `Top-up via ${p.method}`,
            createdAt: p.createdAt,
          })),
      );
    }
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
    // Continue on billing page for payment instructions / verification.
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
          <CardDescription>Used for campaign spend after admin approval.</CardDescription>
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
          <CardTitle className="text-base">Recent top-ups</CardTitle>
          <CardDescription>Pending and completed wallet payments</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wallet top-ups yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                  <span>
                    {tx.description} · {tx.type}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    ${(tx.amountCents / 100).toFixed(2)} · {new Date(tx.createdAt).toLocaleDateString()}
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

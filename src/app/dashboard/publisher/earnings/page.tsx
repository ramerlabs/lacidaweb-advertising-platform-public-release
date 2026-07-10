"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ClientPaymentMethod } from "@/lib/payment-methods";

type MethodOption = {
  method: ClientPaymentMethod;
  label: string;
  hint: string;
};

type Summary = {
  balanceCents: number;
  lifetimeEarnedCents: number;
  lifetimePaidCents: number;
  pendingPayoutCents: number;
  availableToRequestCents: number;
  validImpressions: number;
  validClicks: number;
  fraudBlocked: number;
  rates: { cpmCents: number; cpcCents: number; minPayoutCents: number };
  canRequestPayout: boolean;
};

type PayoutRow = {
  id: string;
  amountCents: number;
  method: string;
  status: string;
  payoutDetails: string;
  rejectionReason: string | null;
  createdAt: string;
  paidAt: string | null;
};

type LedgerTx = {
  id: string;
  type: string;
  status: string;
  amountUsd: string;
  description: string | null;
  createdAt: string;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusVariant(status: string) {
  if (status === "PAID") return "default" as const;
  if (status === "PENDING" || status === "APPROVED") return "secondary" as const;
  if (status === "REJECTED") return "danger" as const;
  return "outline" as const;
}

export default function PublisherEarningsPage() {
  const { teamId } = useTeam();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [methods, setMethods] = useState<MethodOption[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [ledger, setLedger] = useState<LedgerTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [amountUsd, setAmountUsd] = useState("");
  const [method, setMethod] = useState<ClientPaymentMethod | "">("");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [notes, setNotes] = useState("");

  const selectedHint = useMemo(
    () => methods.find((m) => m.method === method)?.hint || "",
    [methods, method],
  );

  async function load() {
    if (!teamId) return;
    setLoading(true);
    const [res, ledgerRes] = await Promise.all([
      fetch(`/api/publisher/earnings?teamId=${encodeURIComponent(teamId)}`),
      fetch(`/api/billing/wallet-transactions?teamId=${encodeURIComponent(teamId)}`),
    ]);
    const data = await res.json();
    const ledgerData = await ledgerRes.json();
    setLoading(false);
    if (!res.ok) {
      setStatus(data.error || "Failed to load earnings");
      return;
    }
    setSummary(data.summary);
    setMethods(data.methods || []);
    setPayouts(data.payouts || []);
    if (ledgerRes.ok) setLedger(ledgerData.transactions || []);
    if (!method && data.methods?.[0]) setMethod(data.methods[0].method);
    if (!amountUsd && data.summary) {
      setAmountUsd((data.summary.rates.minPayoutCents / 100).toFixed(2));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function requestPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !method) return;
    setSubmitting(true);
    setStatus("");
    const res = await fetch("/api/publisher/earnings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        amountUsd: Number(amountUsd),
        method,
        payoutDetails,
        notes: notes.trim() || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setStatus(typeof data.error === "string" ? data.error : "Payout request failed");
      return;
    }
    setStatus(data.message || "Payout requested");
    setPayoutDetails("");
    setNotes("");
    await load();
  }

  if (loading && !summary) {
    return <p className="text-sm text-muted-foreground">Loading earnings...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Publisher
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Earnings & payouts</h1>
        <p className="text-muted-foreground">
          You earn from valid impressions (CPM) and clicks (CPC). Fraudulent traffic is filtered
          out automatically.
        </p>
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat title="Available balance" value={money(summary.balanceCents)} />
          <Stat title="Pending payouts" value={money(summary.pendingPayoutCents)} />
          <Stat title="Lifetime earned" value={money(summary.lifetimeEarnedCents)} />
          <Stat title="Lifetime paid" value={money(summary.lifetimePaidCents)} />
        </div>
      ) : null}

      {summary ? (
        <Card>
          <CardHeader>
            <CardTitle>How you get paid</CardTitle>
            <CardDescription>
              Only valid events count. Bots, duplicate clicks, and flooded requests are blocked.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              title="CPM rate"
              value={`${money(summary.rates.cpmCents)} / 1,000 views`}
              compact
            />
            <Stat title="CPC rate" value={`${money(summary.rates.cpcCents)} / click`} compact />
            <Stat title="Valid impressions" value={summary.validImpressions.toLocaleString()} compact />
            <Stat title="Valid clicks" value={summary.validClicks.toLocaleString()} compact />
            <Stat
              title="Fraud blocked"
              value={summary.fraudBlocked.toLocaleString()}
              compact
            />
            <Stat
              title="Minimum payout"
              value={money(summary.rates.minPayoutCents)}
              compact
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request payout</CardTitle>
            <CardDescription>
              Choose an enabled payment method and enter where we should send your earnings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!methods.length ? (
              <p className="text-sm text-muted-foreground">
                No payout methods are available right now. Contact support.
              </p>
            ) : (
              <form onSubmit={requestPayout} className="space-y-4">
                <div className="space-y-2">
                  <Label>Available methods</Label>
                  <div className="grid gap-2">
                    {methods.map((option) => (
                      <label
                        key={option.method}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                          method === option.method ? "border-emerald-500 bg-emerald-500/5" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="method"
                          className="mt-1"
                          checked={method === option.method}
                          onChange={() => setMethod(option.method)}
                        />
                        <span>
                          <span className="font-medium">{option.label}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {option.hint}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={summary ? summary.rates.minPayoutCents / 100 : 1}
                    step="0.01"
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">Your payout destination</Label>
                  <Textarea
                    id="details"
                    rows={3}
                    placeholder={selectedHint || "Wallet / account details"}
                    value={payoutDetails}
                    onChange={(e) => setPayoutDetails(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Note (optional)</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything else we should know"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={
                    submitting || !summary?.canRequestPayout || !method || methods.length === 0
                  }
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  {submitting ? "Submitting..." : "Submit payout request"}
                </Button>
                {summary && !summary.canRequestPayout ? (
                  <p className="text-xs text-muted-foreground">
                    You need at least {money(summary.rates.minPayoutCents)} available to request a
                    payout.
                  </p>
                ) : null}
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout history</CardTitle>
            <CardDescription>Track pending, approved, paid, and rejected requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payout requests yet.</p>
            ) : (
              payouts.map((payout) => (
                <div key={payout.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{money(payout.amountCents)}</p>
                    <Badge variant={statusVariant(payout.status)}>
                      {payout.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {payout.method} · {new Date(payout.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {payout.payoutDetails}
                  </p>
                  {payout.rejectionReason ? (
                    <p className="mt-2 text-xs text-rose-600">{payout.rejectionReason}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction log</CardTitle>
          <CardDescription>
            Earnings credits and payouts. Entries older than 7 days are removed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
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

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}

function Stat({
  title,
  value,
  compact,
}: {
  title: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-lg border bg-muted/20 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className={`${compact ? "text-base" : "text-xl"} font-semibold tabular-nums`}>{value}</p>
    </div>
  );
}

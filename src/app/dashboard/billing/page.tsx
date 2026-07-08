"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTeam } from "@/components/dashboard/team-provider";
import { PlanPricingGrid } from "@/components/dashboard/plan-pricing-grid";
import { UsdtPaymentHighlight } from "@/components/billing/usdt-payment-highlight";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Subscription = {
  id: string;
  planId: string;
  status: string;
  accountLimit: number;
  interval: "MONTHLY" | "YEARLY";
  amount: number;
};

type Payment = {
  id: string;
  method: string;
  status: string;
  amount: number;
  usdtAmount?: number | null;
  txHash?: string | null;
  notes?: string | null;
  createdAt: string;
};

export default function BillingPage() {
  const { teamId } = useTeam();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usdtWallet, setUsdtWallet] = useState("");
  const [status, setStatus] = useState("");
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const paymentsRef = useRef<HTMLDivElement>(null);

  const pendingUsdtPayment = payments.find((p) => p.method === "USDT" && p.status === "PENDING");

  async function load() {
    if (!teamId) return;
    const [subRes, payRes, methodsRes] = await Promise.all([
      fetch(`/api/billing/subscription?teamId=${teamId}`),
      fetch(`/api/billing/payments?teamId=${teamId}`),
      fetch("/api/billing/payment-methods"),
    ]);
    const subData = await subRes.json();
    const payData = await payRes.json();
    const methodsData = await methodsRes.json();
    setSubscription(subData.subscription || null);
    setPayments(payData.payments || []);
    if (methodsRes.ok) setUsdtWallet(methodsData.usdtWallet || "");
  }

  useEffect(() => {
    load();
  }, [teamId]);

  async function verifyUsdtPayment(paymentId: string) {
    if (!teamId) return;
    const txHash = txHashes[paymentId]?.trim();
    if (!txHash) {
      setStatus("Enter your transaction hash first.");
      return;
    }
    setVerifyingId(paymentId);
    setStatus("");
    const res = await fetch(`/api/billing/payments/${paymentId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, txHash }),
    });
    const data = await res.json();
    setVerifyingId(null);
    if (!res.ok) {
      setStatus(data.error || "Verification failed");
      return;
    }
    setStatus(data.message || "Payment verified. Your subscription is now active.");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage subscription and payment method</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current subscription</CardTitle>
          <CardDescription>Plan, status and account limits</CardDescription>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-1 text-sm">
              <p><strong>Plan:</strong> {subscription.planId}</p>
              <p><strong>Status:</strong> {subscription.status}</p>
              <p><strong>Limit:</strong> {subscription.accountLimit} accounts</p>
              <p><strong>Billing:</strong> ${subscription.amount} / {subscription.interval.toLowerCase()}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No subscription yet. Choose a plan below.</p>
          )}
        </CardContent>
      </Card>

      {pendingUsdtPayment?.usdtAmount && usdtWallet ? (
        <UsdtPaymentHighlight
          paymentId={pendingUsdtPayment.id}
          usdtAmount={pendingUsdtPayment.usdtAmount}
          walletAddress={usdtWallet}
          onVerifyClick={() => paymentsRef.current?.scrollIntoView({ behavior: "smooth" })}
        />
      ) : null}

      <PlanPricingGrid
        teamId={teamId}
        currentPlanId={subscription?.planId}
        subscriptionStatus={subscription?.status}
        onCheckoutComplete={load}
        showHeading
      />

      <div ref={paymentsRef}>
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Recent payment requests and statuses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="space-y-2 rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p>{payment.method} - ${payment.amount}</p>
                    {payment.usdtAmount ? (
                      <p className="text-muted-foreground">USDT amount: {payment.usdtAmount}</p>
                    ) : null}
                    <p className="text-muted-foreground">{new Date(payment.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="font-medium">{payment.status}</div>
                </div>
                {payment.method === "USDT" && payment.status === "PENDING" ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder="Paste TRC20 transaction hash"
                      value={txHashes[payment.id] || ""}
                      onChange={(e) =>
                        setTxHashes((prev) => ({ ...prev, [payment.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      disabled={verifyingId === payment.id}
                      onClick={() => verifyUsdtPayment(payment.id)}
                    >
                      {verifyingId === payment.id ? "Verifying..." : "Verify payment"}
                    </Button>
                  </div>
                ) : null}
                {payment.txHash ? (
                  <p className="break-all text-xs text-muted-foreground">TX: {payment.txHash}</p>
                ) : null}
                {payment.notes && payment.status === "PENDING" ? (
                  <p className="text-xs text-muted-foreground">{payment.notes}</p>
                ) : null}
              </div>
            ))
          )}
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Button asChild variant="outline">
        <Link href="/dashboard">Back to overview</Link>
      </Button>
    </div>
  );
}

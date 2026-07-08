"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getPlanById } from "@/lib/pricing";

type CheckoutResult = {
  payment: { id: string };
  instructions: string;
  usdtAmount?: number;
  walletAddress?: string;
};

type PaymentMethodOption = "USDT" | "PAYPAL" | "GCASH";

type EnabledMethods = Record<PaymentMethodOption, boolean>;

function CheckoutPageContent() {
  const search = useSearchParams();
  const plan = useMemo(() => getPlanById(search.get("plan")), [search]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>("USDT");
  const [enabledMethods, setEnabledMethods] = useState<EnabledMethods>({
    USDT: true,
    PAYPAL: true,
    GCASH: true,
  });
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [txHash, setTxHash] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function loadTeam() {
      const [teamRes, methodsRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/billing/payment-methods"),
      ]);
      const teamData = await teamRes.json();
      const methodsData = await methodsRes.json();
      if (teamRes.ok) {
        setTeamId(teamData.teams?.[0]?.id ?? null);
      } else {
        setStatus("Please sign in before checkout.");
      }
      if (methodsRes.ok && methodsData.methods) {
        const methods = methodsData.methods as EnabledMethods;
        setEnabledMethods(methods);
        const firstEnabled = (["USDT", "PAYPAL", "GCASH"] as PaymentMethodOption[]).find(
          (m) => methods[m],
        );
        if (firstEnabled) setPaymentMethod(firstEnabled);
      }
    }
    loadTeam();
  }, []);

  async function startCheckout() {
    if (!teamId) return;
    setLoading(true);
    setStatus("");
    setCheckout(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        planId: plan.id,
        interval: "MONTHLY",
        method: paymentMethod,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus(data.error || "Checkout failed");
      return;
    }
    setCheckout(data);
    setStatus(data.instructions);
  }

  async function verifyPayment() {
    if (!teamId || !checkout?.payment?.id || !txHash.trim()) return;
    setVerifying(true);
    setStatus("");
    const res = await fetch(`/api/billing/payments/${checkout.payment.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, txHash: txHash.trim() }),
    });
    const data = await res.json();
    setVerifying(false);
    if (!res.ok) {
      setStatus(data.error || "Verification failed");
      return;
    }
    setStatus(data.message || "Payment verified. Redirecting to dashboard...");
    setTimeout(() => {
      window.location.href = "/dashboard/billing";
    }, 1500);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Checkout</CardTitle>
              <CardDescription>Select billing and complete payment for {plan.name}</CardDescription>
            </div>
            <Badge>{plan.accountLimit} accounts</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="mt-1 text-xl font-semibold">{plan.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ${plan.monthlyPrice}/month or ${plan.yearlyPrice}/year
            </p>
          </div>

          {!checkout ? (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Choose payment option</p>
              {enabledMethods.USDT || enabledMethods.PAYPAL || enabledMethods.GCASH ? (
                <>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodOption)}
                  >
                    {enabledMethods.USDT ? (
                      <option value="USDT">USDT Crypto (TRC20 — auto verify)</option>
                    ) : null}
                    {enabledMethods.PAYPAL ? <option value="PAYPAL">PayPal</option> : null}
                    {enabledMethods.GCASH ? <option value="GCASH">GCash</option> : null}
                  </select>
                  <Button className="w-full" size="lg" onClick={startCheckout} disabled={loading || !teamId}>
                    {loading ? "Creating payment..." : "Create payment request"}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No payment methods are available right now.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border p-4">
              {paymentMethod === "USDT" && checkout.usdtAmount && checkout.walletAddress ? (
                <>
                  <p className="text-sm">
                    Send exactly <strong>{checkout.usdtAmount} USDT</strong> (TRC20) to:
                  </p>
                  <p className="break-all rounded bg-muted p-2 font-mono text-xs">{checkout.walletAddress}</p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Transaction hash</p>
                    <Input
                      placeholder="Paste your TRC20 transaction hash"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                    />
                    <Button className="w-full" onClick={verifyPayment} disabled={verifying || !txHash.trim()}>
                      {verifying ? "Checking blockchain..." : "Submit & verify payment"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{checkout.instructions}</p>
              )}
            </div>
          )}

          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

          <div className="flex items-center justify-between">
            <Button asChild variant="ghost">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back to pricing
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/register?plan=${plan.id}`}>Register account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-sm text-muted-foreground">Loading checkout...</main>}>
      <CheckoutPageContent />
    </Suspense>
  );
}

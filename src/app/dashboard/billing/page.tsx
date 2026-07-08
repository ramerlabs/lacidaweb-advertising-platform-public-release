"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTeam } from "@/components/dashboard/team-provider";
import { PlanPricingGrid } from "@/components/dashboard/plan-pricing-grid";
import { UsdtPaymentHighlight } from "@/components/billing/usdt-payment-highlight";
import { ManualPaymentHighlight } from "@/components/billing/manual-payment-highlight";
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

import { formatTokenCount } from "@/lib/ai-pricing";

type Payment = {
  id: string;
  method: string;
  status: string;
  amount: number;
  purpose?: string;
  aiTokensGranted?: number | null;
  usdtAmount?: number | null;
  txHash?: string | null;
  notes?: string | null;
  createdAt: string;
};

type AiUsage = {
  id: string;
  type: string;
  tokensUsed: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
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
  const [tokenBalance, setTokenBalance] = useState(0);
  const [aiPackUsd, setAiPackUsd] = useState(10);
  const [tokensPerPack, setTokensPerPack] = useState(0);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [buyingTokens, setBuyingTokens] = useState(false);
  const [pendingManual, setPendingManual] = useState<{
    method: "PAYPAL" | "GCASH";
    amountUsd: number;
    tokensGranted: number;
    instructions: string;
  } | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage[]>([]);
  const paymentsRef = useRef<HTMLDivElement>(null);

  const pendingUsdtPayment = payments.find((p) => p.method === "USDT" && p.status === "PENDING");

  async function load() {
    if (!teamId) return;
    const [subRes, payRes, methodsRes, aiRes, pricingRes, usageRes] = await Promise.all([
      fetch(`/api/billing/subscription?teamId=${teamId}`),
      fetch(`/api/billing/payments?teamId=${teamId}`),
      fetch("/api/billing/payment-methods"),
      fetch(`/api/ai/generate?teamId=${teamId}`),
      fetch("/api/ai/pricing"),
      fetch(`/api/ai/usage?teamId=${teamId}`),
    ]);
    const subData = await subRes.json();
    const payData = await payRes.json();
    const methodsData = await methodsRes.json();
    const aiData = await aiRes.json();
    const pricingData = await pricingRes.json();
    const usageData = await usageRes.json();
    setSubscription(subData.subscription || null);
    setPayments(payData.payments || []);
    if (methodsRes.ok) setUsdtWallet(methodsData.usdtWallet || "");
    if (aiRes.ok) {
      setTokenBalance(aiData.tokenBalance || 0);
      setAiEnabled(aiData.aiEnabled);
    }
    if (pricingRes.ok && pricingData.settings) {
      setAiPackUsd(pricingData.settings.packPriceUsd || 10);
      setTokensPerPack(pricingData.settings.tokensPerPack || 0);
    }
    if (usageRes.ok) setAiUsage(usageData.usage || []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setStatus(
      data.message ||
        (data.payment?.purpose === "AI_CREDITS"
          ? "Payment verified. AI tokens added to your balance."
          : "Payment verified. Your subscription is now active."),
    );
    await load();
  }

  async function buyAiTokens(method: "USDT" | "PAYPAL" | "GCASH") {
    if (!teamId) return;
    setBuyingTokens(true);
    setStatus("");
    const res = await fetch("/api/billing/ai-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, method }),
    });
    const data = await res.json();
    setBuyingTokens(false);
    if (!res.ok) {
      setStatus(data.error || "Could not start AI token purchase");
      return;
    }
    const granted = data.aiTokensGranted || tokensPerPack;
    if (method === "USDT") {
      setPendingManual(null);
      setStatus(
        `Pay ${data.usdtAmount} USDT — see below. You will receive ${granted.toLocaleString()} tokens after verification.`,
      );
    } else {
      setPendingManual({
        method,
        amountUsd: data.payment?.amount || aiPackUsd,
        tokensGranted: granted,
        instructions: data.instructions || data.payment?.notes || "",
      });
      setStatus("");
    }
    await load();
    paymentsRef.current?.scrollIntoView({ behavior: "smooth" });
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

      {aiEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle>AI tokens</CardTitle>
            <CardDescription>
              Balance: {tokenBalance.toLocaleString()} tokens ({formatTokenCount(tokenBalance)}) — used
              for AI generation in Compose
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              Pay <strong>${aiPackUsd.toFixed(2)}</strong> → receive{" "}
              <strong>{tokensPerPack.toLocaleString()}</strong> tokens ({formatTokenCount(tokensPerPack)}).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={buyingTokens} onClick={() => buyAiTokens("USDT")}>
                Buy with USDT
              </Button>
              <Button size="sm" variant="secondary" disabled={buyingTokens} onClick={() => buyAiTokens("PAYPAL")}>
                Buy with PayPal
              </Button>
              <Button size="sm" variant="outline" disabled={buyingTokens} onClick={() => buyAiTokens("GCASH")}>
                Buy with GCash
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {pendingManual ? (
        <ManualPaymentHighlight
          method={pendingManual.method}
          amountUsd={pendingManual.amountUsd}
          tokensGranted={pendingManual.tokensGranted}
          instructions={pendingManual.instructions}
        />
      ) : null}

      {aiEnabled && aiUsage.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>AI usage history</CardTitle>
            <CardDescription>Recent text and image generations charged to your balance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {aiUsage.slice(0, 10).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium capitalize">{row.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                    {row.type === "text" && row.promptTokens
                      ? ` · ${(row.tokensUsed || row.promptTokens + (row.completionTokens || 0)).toLocaleString()} tokens`
                      : row.tokensUsed
                        ? ` · ${row.tokensUsed.toLocaleString()} tokens`
                        : ""}
                  </p>
                </div>
                <p className="font-medium">-{row.tokensUsed?.toLocaleString() || "—"} tokens</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

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
                    <p>{payment.method} - ${payment.amount}{payment.purpose === "AI_CREDITS" ? " (AI tokens)" : ""}</p>
                    {payment.purpose === "AI_CREDITS" && payment.aiTokensGranted ? (
                      <p className="text-muted-foreground">
                        Tokens: {payment.aiTokensGranted.toLocaleString()}
                        {payment.status === "PAID" ? " — added to your balance" : " — pending approval"}
                      </p>
                    ) : null}
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
                  <pre className="whitespace-pre-wrap rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                    {payment.notes}
                  </pre>
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

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTeam } from "@/components/dashboard/team-provider";
import { PlanPricingGrid } from "@/components/dashboard/plan-pricing-grid";
import { UsdtPaymentHighlight } from "@/components/billing/usdt-payment-highlight";
import { ManualPaymentHighlight } from "@/components/billing/manual-payment-highlight";
import { BankPaymentHighlight } from "@/components/billing/bank-payment-highlight";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_ENABLED_METHODS,
  type ClientPaymentMethod,
  type EnabledPaymentMethods,
  type UsBankDetails,
  paymentMethodLabel,
} from "@/lib/payment-methods";
import { formatTokenCount } from "@/lib/ai-pricing";

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
  purpose?: string;
  aiTokensGranted?: number | null;
  usdtAmount?: number | null;
  txHash?: string | null;
  externalRef?: string | null;
  notes?: string | null;
  proofUrl?: string | null;
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

function BankPaymentInlineReference({
  paymentId,
  teamId,
  onDone,
}: {
  paymentId: string;
  teamId: string;
  onDone: () => void;
}) {
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!reference.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/billing/payments/${paymentId}/reference`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, reference: reference.trim() }),
    });
    setSubmitting(false);
    if (res.ok) onDone();
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        placeholder="Bank transfer reference"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
      />
      <Button size="sm" disabled={submitting} onClick={submit}>
        {submitting ? "Saving..." : "Submit reference"}
      </Button>
    </div>
  );
}

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
  const [enabledMethods, setEnabledMethods] = useState<EnabledPaymentMethods>(DEFAULT_ENABLED_METHODS);
  const [usBankDetails, setUsBankDetails] = useState<UsBankDetails | null>(null);
  const [pendingManual, setPendingManual] = useState<{
    method: "PAYPAL" | "GCASH";
    amountUsd: number;
    tokensGranted: number;
    instructions: string;
  } | null>(null);
  const [pendingBank, setPendingBank] = useState<{
    paymentId: string;
    amountUsd: number;
    tokensGranted: number;
    instructions: string;
  } | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage[]>([]);
  const [adWalletBalanceCents, setAdWalletBalanceCents] = useState(0);
  const [adWalletTopUpUsd, setAdWalletTopUpUsd] = useState(25);
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [buyingAdWallet, setBuyingAdWallet] = useState(false);
  const [pendingAdWalletBank, setPendingAdWalletBank] = useState<{
    paymentId: string;
    amountUsd: number;
    instructions: string;
  } | null>(null);
  const [uploadingProofId, setUploadingProofId] = useState<string | null>(null);
  const paymentsRef = useRef<HTMLDivElement>(null);

  const pendingUsdtPayment = payments.find((p) => p.method === "USDT" && p.status === "PENDING");

  async function load() {
    if (!teamId) return;
    const [subRes, payRes, methodsRes, aiRes, pricingRes, usageRes, adWalletRes] = await Promise.all([
      fetch(`/api/billing/subscription?teamId=${teamId}`),
      fetch(`/api/billing/payments?teamId=${teamId}`),
      fetch("/api/billing/payment-methods"),
      fetch(`/api/ai/generate?teamId=${teamId}`),
      fetch("/api/ai/pricing"),
      fetch(`/api/ai/usage?teamId=${teamId}`),
      fetch(`/api/billing/ad-wallet?teamId=${teamId}`),
    ]);
    const subData = await subRes.json();
    const payData = await payRes.json();
    const methodsData = await methodsRes.json();
    const aiData = await aiRes.json();
    const pricingData = await pricingRes.json();
    const usageData = await usageRes.json();
    const adWalletData = await adWalletRes.json();
    setSubscription(subData.subscription || null);
    setPayments(payData.payments || []);
    if (methodsRes.ok) {
      setUsdtWallet(methodsData.usdtWallet || "");
      if (methodsData.methods) setEnabledMethods(methodsData.methods);
      setUsBankDetails(methodsData.usBank || null);
    }
    if (aiRes.ok) {
      setTokenBalance(aiData.tokenBalance || 0);
      setAiEnabled(aiData.aiEnabled);
    }
    if (pricingRes.ok && pricingData.settings) {
      setAiPackUsd(pricingData.settings.packPriceUsd || 10);
      setTokensPerPack(pricingData.settings.tokensPerPack || 0);
    }
    if (usageRes.ok) setAiUsage(usageData.usage || []);
    if (adWalletRes.ok) {
      setAdWalletBalanceCents(adWalletData.adWalletBalanceCents || 0);
      setAdWalletTopUpUsd(adWalletData.adWalletTopUpUsd || 25);
      setAdsEnabled(Boolean(adWalletData.adsEnabled));
    }
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
          : data.payment?.purpose === "AD_WALLET"
            ? "Payment verified. Ad wallet topped up."
            : data.payment?.purpose === "AD_CAMPAIGN"
              ? "Payment verified. Your ad is being published."
              : "Payment verified. Your subscription is now active."),
    );
    await load();
  }

  async function buyAiTokens(method: ClientPaymentMethod) {
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
      setPendingBank(null);
      setStatus(
        `Pay ${data.usdtAmount} USDT — see below. You will receive ${granted.toLocaleString()} tokens after verification.`,
      );
    } else if (method === "US_BANK") {
      setPendingManual(null);
      setPendingBank({
        paymentId: data.payment?.id,
        amountUsd: data.payment?.amount || aiPackUsd,
        tokensGranted: granted,
        instructions: data.instructions || "",
      });
      setStatus("");
    } else {
      setPendingBank(null);
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

  async function buyAdWallet(method: ClientPaymentMethod) {
    if (!teamId) return;
    setBuyingAdWallet(true);
    setStatus("");
    const res = await fetch("/api/billing/ad-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, method }),
    });
    const data = await res.json();
    setBuyingAdWallet(false);
    if (!res.ok) {
      setStatus(data.error || "Could not start ad wallet top-up");
      return;
    }
    if (method === "USDT") {
      setPendingManual(null);
      setPendingBank(null);
      setPendingAdWalletBank(null);
      setStatus(`Pay ${data.usdtAmount} USDT — see below. Ad wallet credits after verification.`);
    } else if (method === "US_BANK") {
      setPendingManual(null);
      setPendingBank(null);
      setPendingAdWalletBank({
        paymentId: data.payment?.id,
        amountUsd: data.payment?.amount || adWalletTopUpUsd,
        instructions: data.instructions || "",
      });
      setStatus("");
    } else {
      setPendingAdWalletBank(null);
      setPendingManual({
        method,
        amountUsd: data.payment?.amount || adWalletTopUpUsd,
        tokensGranted: 0,
        instructions: data.instructions || data.payment?.notes || "",
      });
      setStatus(`Pay $${(data.payment?.amount || adWalletTopUpUsd).toFixed(2)} for ad wallet top-up. See instructions below.`);
    }
    await load();
    paymentsRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const hasTokenPaymentMethods =
    enabledMethods.USDT ||
    enabledMethods.PAYPAL ||
    enabledMethods.GCASH ||
    enabledMethods.US_BANK;

  async function uploadPaymentProof(paymentId: string, file: File) {
    if (!teamId) return;
    setUploadingProofId(paymentId);
    setStatus("");
    try {
      const presign = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream" }),
      });
      const urls = await presign.json();
      if (!presign.ok) throw new Error(urls.error || "Presign failed");

      const put = await fetch(urls.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");

      const res = await fetch(`/api/billing/payments/${paymentId}/proof`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, proofUrl: urls.publicUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit proof");

      setStatus(data.message || "Payment proof uploaded. Admin will review shortly.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Proof upload failed");
    } finally {
      setUploadingProofId(null);
    }
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
              {enabledMethods.USDT ? (
                <Button size="sm" disabled={buyingTokens} onClick={() => buyAiTokens("USDT")}>
                  Buy with USDT
                </Button>
              ) : null}
              {enabledMethods.PAYPAL ? (
                <Button size="sm" variant="secondary" disabled={buyingTokens} onClick={() => buyAiTokens("PAYPAL")}>
                  Buy with PayPal
                </Button>
              ) : null}
              {enabledMethods.GCASH ? (
                <Button size="sm" variant="outline" disabled={buyingTokens} onClick={() => buyAiTokens("GCASH")}>
                  Buy with GCash
                </Button>
              ) : null}
              {enabledMethods.US_BANK ? (
                <Button size="sm" variant="outline" disabled={buyingTokens} onClick={() => buyAiTokens("US_BANK")}>
                  Buy with US Bank
                </Button>
              ) : null}
            </div>
            {!hasTokenPaymentMethods ? (
              <p className="text-sm text-muted-foreground">No payment methods are enabled yet.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {adsEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Ad wallet</CardTitle>
            <CardDescription>
              Prepaid balance for launching ads — ${(adWalletBalanceCents / 100).toFixed(2)} available
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              Top up <strong>${adWalletTopUpUsd.toFixed(2)}</strong> to pay for ads from your wallet instead of
              checkout each time.
            </p>
            <div className="flex flex-wrap gap-2">
              {enabledMethods.USDT ? (
                <Button size="sm" disabled={buyingAdWallet} onClick={() => buyAdWallet("USDT")}>
                  Top up with USDT
                </Button>
              ) : null}
              {enabledMethods.PAYPAL ? (
                <Button size="sm" variant="secondary" disabled={buyingAdWallet} onClick={() => buyAdWallet("PAYPAL")}>
                  Top up with PayPal
                </Button>
              ) : null}
              {enabledMethods.GCASH ? (
                <Button size="sm" variant="outline" disabled={buyingAdWallet} onClick={() => buyAdWallet("GCASH")}>
                  Top up with GCash
                </Button>
              ) : null}
              {enabledMethods.US_BANK ? (
                <Button size="sm" variant="outline" disabled={buyingAdWallet} onClick={() => buyAdWallet("US_BANK")}>
                  Top up with US Bank
                </Button>
              ) : null}
            </div>
            <Link href="/dashboard/ads" className="text-sm text-primary underline">
              Go to Ads
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {pendingAdWalletBank && usBankDetails && teamId ? (
        <BankPaymentHighlight
          paymentId={pendingAdWalletBank.paymentId}
          teamId={teamId}
          amountUsd={pendingAdWalletBank.amountUsd}
          tokensGranted={0}
          bank={usBankDetails}
          instructions={pendingAdWalletBank.instructions}
          onReferenceSubmitted={load}
        />
      ) : null}

      {pendingManual ? (
        <ManualPaymentHighlight
          method={pendingManual.method}
          amountUsd={pendingManual.amountUsd}
          tokensGranted={pendingManual.tokensGranted}
          instructions={pendingManual.instructions}
        />
      ) : null}

      {pendingBank && usBankDetails && teamId ? (
        <BankPaymentHighlight
          paymentId={pendingBank.paymentId}
          teamId={teamId}
          amountUsd={pendingBank.amountUsd}
          tokensGranted={pendingBank.tokensGranted}
          bank={usBankDetails}
          instructions={pendingBank.instructions}
          onReferenceSubmitted={load}
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
                    <p>{paymentMethodLabel(payment.method as ClientPaymentMethod)} - ${payment.amount}
                      {payment.purpose === "AI_CREDITS"
                        ? " (AI tokens)"
                        : payment.purpose === "AD_WALLET"
                          ? " (Ad wallet)"
                          : payment.purpose === "AD_CAMPAIGN"
                            ? " (Ad campaign)"
                            : ""}
                    </p>
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
                {(payment.method === "PAYPAL" || payment.method === "GCASH") &&
                payment.status === "PENDING" &&
                !payment.proofUrl ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      disabled={uploadingProofId === payment.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadPaymentProof(payment.id, file);
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {uploadingProofId === payment.id ? "Uploading..." : "Upload receipt screenshot"}
                    </span>
                  </div>
                ) : null}
                {payment.proofUrl ? (
                  <p className="text-xs text-muted-foreground">
                    Proof:{" "}
                    <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="underline">
                      View uploaded receipt
                    </a>
                  </p>
                ) : null}
                {payment.externalRef ? (
                  <p className="text-xs text-muted-foreground">Reference: {payment.externalRef}</p>
                ) : null}
                {payment.method === "US_BANK" && payment.status === "PENDING" && !payment.externalRef && teamId ? (
                  <BankPaymentInlineReference paymentId={payment.id} teamId={teamId} onDone={load} />
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

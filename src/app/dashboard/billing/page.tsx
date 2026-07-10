"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { useTeam } from "@/components/dashboard/team-provider";
import { UsdtPaymentHighlight } from "@/components/billing/usdt-payment-highlight";
import { ManualPaymentHighlight } from "@/components/billing/manual-payment-highlight";
import { BankPaymentHighlight } from "@/components/billing/bank-payment-highlight";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_ENABLED_METHODS,
  type ClientPaymentMethod,
  type EnabledPaymentMethods,
  type UsBankDetails,
  paymentMethodLabel,
} from "@/lib/payment-methods";
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

const QUICK_AMOUNTS = [25, 50, 100, 250];

export default function BillingPage() {
  const { teamId } = useTeam();
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
    tokensGranted?: number;
    instructions: string;
  } | null>(null);
  const [pendingBank, setPendingBank] = useState<{
    paymentId: string;
    amountUsd: number;
    tokensGranted?: number;
    instructions: string;
  } | null>(null);
  /** Only the method the user just chose (or latest pending) should show instructions. */
  const [activeCheckoutMethod, setActiveCheckoutMethod] = useState<ClientPaymentMethod | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage[]>([]);
  const [uploadingProofId, setUploadingProofId] = useState<string | null>(null);
  const [walletBalanceUsd, setWalletBalanceUsd] = useState("0.00");
  const [minTopUpUsd, setMinTopUpUsd] = useState(25);
  const [topUpAmount, setTopUpAmount] = useState("25");
  const [toppingUp, setToppingUp] = useState(false);
  const paymentsRef = useRef<HTMLDivElement>(null);

  const pendingUsdtPayment = useMemo(() => {
    const pending = payments
      .filter((p) => p.method === "USDT" && p.status === "PENDING")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return pending[0] || null;
  }, [payments]);

  const amountUsd = useMemo(() => {
    const n = Number(topUpAmount);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }, [topUpAmount]);

  // Prefer the method the user selected; otherwise show only the latest pending payment's method.
  const checkoutMethod = useMemo(() => {
    if (activeCheckoutMethod) return activeCheckoutMethod;
    const latestPending = [...payments]
      .filter((p) => p.status === "PENDING")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!latestPending) return null;
    if (
      latestPending.method === "USDT" ||
      latestPending.method === "PAYPAL" ||
      latestPending.method === "GCASH" ||
      latestPending.method === "US_BANK"
    ) {
      return latestPending.method as ClientPaymentMethod;
    }
    return null;
  }, [activeCheckoutMethod, payments]);

  const showUsdtCheckout = checkoutMethod === "USDT" && Boolean(pendingUsdtPayment && usdtWallet);
  const showManualCheckout =
    (checkoutMethod === "PAYPAL" || checkoutMethod === "GCASH") && Boolean(pendingManual);
  const showBankCheckout = checkoutMethod === "US_BANK" && Boolean(pendingBank && usBankDetails && teamId);

  async function load() {
    if (!teamId) return;
    const [payRes, methodsRes, aiRes, pricingRes, usageRes, walletRes] = await Promise.all([
      fetch(`/api/billing/payments?teamId=${teamId}`),
      fetch("/api/billing/payment-methods"),
      fetch(`/api/ai/generate?teamId=${teamId}`),
      fetch("/api/ai/pricing"),
      fetch(`/api/ai/usage?teamId=${teamId}`),
      fetch(`/api/billing/ad-wallet?teamId=${encodeURIComponent(teamId)}`),
    ]);
    const payData = await payRes.json();
    const methodsData = await methodsRes.json();
    const aiData = await aiRes.json();
    const pricingData = await pricingRes.json();
    const usageData = await usageRes.json();
    const walletData = await walletRes.json();
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
    if (walletRes.ok) {
      if (typeof walletData.adWalletBalanceUsd === "string") {
        setWalletBalanceUsd(walletData.adWalletBalanceUsd);
      }
      const min = Number(walletData.minTopUpUsd || walletData.adWalletTopUpUsd || 25);
      if (Number.isFinite(min) && min > 0) {
        setMinTopUpUsd(min);
        setTopUpAmount((prev) => {
          const current = Number(prev);
          return !Number.isFinite(current) || current < min ? String(min) : prev;
        });
      }
    }

    // Restore checkout panel from the latest pending payment (one method only).
    const latestPending = [...(payData.payments || [])]
      .filter((p: Payment) => p.status === "PENDING")
      .sort(
        (a: Payment, b: Payment) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] as Payment | undefined;

    if (!latestPending) {
      setPendingManual(null);
      setPendingBank(null);
      setActiveCheckoutMethod(null);
    } else if (latestPending.method === "USDT") {
      setPendingManual(null);
      setPendingBank(null);
      setActiveCheckoutMethod((prev) => prev ?? "USDT");
    } else if (latestPending.method === "PAYPAL" || latestPending.method === "GCASH") {
      const method = latestPending.method;
      setPendingBank(null);
      setPendingManual({
        method,
        amountUsd: latestPending.amount,
        tokensGranted: latestPending.aiTokensGranted || undefined,
        instructions: latestPending.notes || "",
      });
      setActiveCheckoutMethod((prev) => prev ?? method);
    } else if (latestPending.method === "US_BANK") {
      setPendingManual(null);
      setPendingBank({
        paymentId: latestPending.id,
        amountUsd: latestPending.amount,
        tokensGranted: latestPending.aiTokensGranted || undefined,
        instructions: latestPending.notes || "",
      });
      setActiveCheckoutMethod((prev) => prev ?? "US_BANK");
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
            : "Payment verified."),
    );
    await load();
  }

  async function topUpWallet(method: ClientPaymentMethod) {
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
      setStatus(data.error || "Could not start wallet top-up");
      return;
    }
    if (method === "USDT") {
      setPendingManual(null);
      setPendingBank(null);
      setActiveCheckoutMethod("USDT");
      setStatus(`Pay ${data.usdtAmount} USDT — see instructions below. Wallet credits after verification.`);
    } else if (method === "US_BANK") {
      setPendingManual(null);
      setActiveCheckoutMethod("US_BANK");
      setPendingBank({
        paymentId: data.payment?.id,
        amountUsd: data.adWalletTopUpUsd || amountUsd,
        tokensGranted: 0,
        instructions: data.instructions || "",
      });
      setStatus("");
    } else {
      setPendingBank(null);
      setActiveCheckoutMethod(method);
      setPendingManual({
        method,
        amountUsd: data.adWalletTopUpUsd || amountUsd,
        instructions: data.instructions || data.payment?.notes || "",
      });
      setStatus("");
    }
    await load();
    paymentsRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function buyAiTokens(method: ClientPaymentMethod | "WALLET") {
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
    if (method === "WALLET" || data.paidWithWallet) {
      setPendingManual(null);
      setPendingBank(null);
      setActiveCheckoutMethod(null);
      if (typeof data.aiTokenBalance === "number") setTokenBalance(data.aiTokenBalance);
      if (typeof data.walletBalanceUsd === "string") setWalletBalanceUsd(data.walletBalanceUsd);
      setStatus(data.message || "AI tokens purchased with wallet balance.");
      await load();
      return;
    }
    const granted = data.aiTokensGranted || tokensPerPack;
    if (method === "USDT") {
      setPendingManual(null);
      setPendingBank(null);
      setActiveCheckoutMethod("USDT");
      setStatus(
        `Pay ${data.usdtAmount} USDT — see below. You will receive ${granted.toLocaleString()} tokens after verification.`,
      );
    } else if (method === "US_BANK") {
      setPendingManual(null);
      setActiveCheckoutMethod("US_BANK");
      setPendingBank({
        paymentId: data.payment?.id,
        amountUsd: data.payment?.amount || aiPackUsd,
        tokensGranted: granted,
        instructions: data.instructions || "",
      });
      setStatus("");
    } else {
      setPendingBank(null);
      setActiveCheckoutMethod(method);
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

  const hasPaymentMethods =
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
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
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
        <p className="text-muted-foreground">
          Top up your ad wallet — no subscription plans. Minimum ${minTopUpUsd.toFixed(2)}.
        </p>
      </div>

      <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-transparent to-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-cyan-500" />
            Ad wallet
          </CardTitle>
          <CardDescription>
            Balance is spent on impressions and clicks after your campaigns go live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">Available balance</p>
            <p className="text-4xl font-bold tabular-nums">${walletBalanceUsd}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topup-amount">Top-up amount (USD)</Label>
            <Input
              id="topup-amount"
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
            <p className="text-xs text-muted-foreground">
              Minimum ${minTopUpUsd.toFixed(2)}. Choose a payment method below to continue.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {enabledMethods.USDT ? (
              <Button disabled={toppingUp} onClick={() => topUpWallet("USDT")}>
                {toppingUp ? "Starting..." : `Top up $${amountUsd.toFixed(2)} with USDT`}
              </Button>
            ) : null}
            {enabledMethods.PAYPAL ? (
              <Button
                variant="secondary"
                disabled={toppingUp}
                onClick={() => topUpWallet("PAYPAL")}
              >
                PayPal
              </Button>
            ) : null}
            {enabledMethods.GCASH ? (
              <Button variant="outline" disabled={toppingUp} onClick={() => topUpWallet("GCASH")}>
                GCash
              </Button>
            ) : null}
            {enabledMethods.US_BANK ? (
              <Button variant="outline" disabled={toppingUp} onClick={() => topUpWallet("US_BANK")}>
                US Bank
              </Button>
            ) : null}
          </div>
          {!hasPaymentMethods ? (
            <p className="text-sm text-muted-foreground">No payment methods are enabled yet.</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Prefer the dedicated wallet page?{" "}
            <Link href="/dashboard/wallet" className="underline underline-offset-2">
              Open Wallet
            </Link>
          </p>
        </CardContent>
      </Card>

      {aiEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle>AI tokens (optional)</CardTitle>
            <CardDescription>
              Balance: {tokenBalance.toLocaleString()} tokens ({formatTokenCount(tokenBalance)})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              Pay <strong>${aiPackUsd.toFixed(2)}</strong> → receive{" "}
              <strong>{tokensPerPack.toLocaleString()}</strong> tokens.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={buyingTokens || Number(walletBalanceUsd) < aiPackUsd}
                onClick={() => buyAiTokens("WALLET")}
              >
                {buyingTokens ? "Buying..." : `Pay with wallet ($${aiPackUsd.toFixed(2)})`}
              </Button>
              {enabledMethods.USDT ? (
                <Button size="sm" variant="secondary" disabled={buyingTokens} onClick={() => buyAiTokens("USDT")}>
                  Buy with USDT
                </Button>
              ) : null}
              {enabledMethods.PAYPAL ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={buyingTokens}
                  onClick={() => buyAiTokens("PAYPAL")}
                >
                  Buy with PayPal
                </Button>
              ) : null}
              {enabledMethods.GCASH ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={buyingTokens}
                  onClick={() => buyAiTokens("GCASH")}
                >
                  Buy with GCash
                </Button>
              ) : null}
              {enabledMethods.US_BANK ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={buyingTokens}
                  onClick={() => buyAiTokens("US_BANK")}
                >
                  Buy with US Bank
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showManualCheckout && pendingManual ? (
        <ManualPaymentHighlight
          method={pendingManual.method}
          amountUsd={pendingManual.amountUsd}
          tokensGranted={pendingManual.tokensGranted}
          instructions={pendingManual.instructions}
        />
      ) : null}

      {showBankCheckout && pendingBank && usBankDetails && teamId ? (
        <BankPaymentHighlight
          paymentId={pendingBank.paymentId}
          teamId={teamId}
          amountUsd={pendingBank.amountUsd}
          tokensGranted={pendingBank.tokensGranted}
          instructions={pendingBank.instructions}
          bank={usBankDetails}
          onReferenceSubmitted={() => void load()}
        />
      ) : null}

      {showUsdtCheckout && pendingUsdtPayment && usdtWallet ? (
        <UsdtPaymentHighlight
          usdtAmount={pendingUsdtPayment.usdtAmount || pendingUsdtPayment.amount}
          walletAddress={usdtWallet}
          paymentId={pendingUsdtPayment.id}
        />
      ) : null}

      <div ref={paymentsRef}>
        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>Wallet top-ups and optional AI token purchases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {paymentMethodLabel(payment.method as ClientPaymentMethod)} · $
                        {payment.amount}
                        {payment.purpose === "AD_WALLET"
                          ? " · Wallet top-up"
                          : payment.purpose === "AI_CREDITS"
                            ? " · AI tokens"
                            : ""}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleString()} · {payment.status}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        Payment ID: {payment.id}
                      </p>
                    </div>
                    {payment.status === "PENDING" && payment.method !== "USDT" ? (
                      <label className="text-xs">
                        <span className="mb-1 block text-muted-foreground">Upload proof</span>
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          disabled={uploadingProofId === payment.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadPaymentProof(payment.id, file);
                          }}
                        />
                      </label>
                    ) : null}
                  </div>

                  {payment.status === "PENDING" && payment.method === "USDT" ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        placeholder="Transaction hash"
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

                  {payment.status === "PENDING" &&
                  payment.method === "US_BANK" &&
                  !payment.externalRef &&
                  teamId ? (
                    <BankPaymentInlineReference
                      paymentId={payment.id}
                      teamId={teamId}
                      onDone={() => void load()}
                    />
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {aiUsage.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent AI usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {aiUsage.slice(0, 8).map((row) => (
              <div key={row.id} className="flex justify-between gap-3 border-b py-2 last:border-0">
                <span>{row.type}</span>
                <span className="text-muted-foreground">
                  {(row.tokensUsed || 0).toLocaleString()} tokens ·{" "}
                  {new Date(row.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}

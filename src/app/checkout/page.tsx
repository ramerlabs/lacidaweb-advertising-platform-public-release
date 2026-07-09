"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getPlanById, type Plan } from "@/lib/pricing";
import {
  DEFAULT_ENABLED_METHODS,
  type ClientPaymentMethod,
  type EnabledPaymentMethods,
} from "@/lib/payment-methods";

type CheckoutResult = {
  payment: { id: string; amount?: number };
  instructions: string;
  usdtAmount?: number;
  walletAddress?: string;
};

type AdCampaignContext = {
  campaign: {
    id: string;
    name: string;
    clientChargeUsd: number;
    platformBudgetUsd: number;
    budgetAmount: number;
    budgetType: string;
  };
  amountUsd: number;
};

function CheckoutPageContent() {
  const search = useSearchParams();
  const purpose = search.get("purpose") || "subscription";
  const campaignId = search.get("campaignId");
  const planId = search.get("plan");
  const [plan, setPlan] = useState<Plan>(() => getPlanById(planId));

  const [teamId, setTeamId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<ClientPaymentMethod>("USDT");
  const [enabledMethods, setEnabledMethods] = useState<EnabledPaymentMethods>(DEFAULT_ENABLED_METHODS);
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [txHash, setTxHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [adContext, setAdContext] = useState<AdCampaignContext | null>(null);
  const [adWalletTopUpUsd, setAdWalletTopUpUsd] = useState(25);

  useEffect(() => {
    if (!planId || purpose !== "subscription") return;
    fetch("/api/pricing/plans")
      .then((r) => r.json())
      .then((data) => {
        const match = data.plans?.find((p: Plan) => p.id === planId);
        if (match) setPlan(match);
      })
      .catch(() => undefined);
  }, [planId, purpose]);

  useEffect(() => {
    async function loadTeam() {
      const [teamRes, methodsRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/billing/payment-methods"),
      ]);
      const teamData = await teamRes.json();
      const methodsData = await methodsRes.json();
      const tid = teamData.teams?.[0]?.id ?? null;
      if (teamRes.ok) {
        setTeamId(tid);
      } else {
        setStatus("Please sign in before checkout.");
      }
      if (methodsRes.ok && methodsData.methods) {
        const methods = methodsData.methods as EnabledPaymentMethods;
        setEnabledMethods(methods);
        const firstEnabled = (["USDT", "PAYPAL", "GCASH", "US_BANK"] as ClientPaymentMethod[]).find(
          (m) => methods[m],
        );
        if (firstEnabled) setPaymentMethod(firstEnabled);
      }

      if (tid && purpose === "ad_campaign" && campaignId) {
        const res = await fetch(
          `/api/billing/ad-campaign?teamId=${encodeURIComponent(tid)}&campaignId=${encodeURIComponent(campaignId)}`,
        );
        const data = await res.json();
        if (res.ok) setAdContext(data);
        else setStatus(data.error || "Could not load ad checkout");
      }

      if (tid && purpose === "ad_wallet") {
        const res = await fetch(`/api/billing/ad-wallet?teamId=${encodeURIComponent(tid)}`);
        const data = await res.json();
        if (res.ok) setAdWalletTopUpUsd(data.adWalletTopUpUsd || 25);
      }
    }
    void loadTeam();
  }, [purpose, campaignId]);

  const title =
    purpose === "ad_campaign"
      ? "Pay for ad"
      : purpose === "ad_wallet"
        ? "Top up ad wallet"
        : "Checkout";

  const description =
    purpose === "ad_campaign" && adContext
      ? `Complete payment to publish "${adContext.campaign.name}"`
      : purpose === "ad_wallet"
        ? `Add $${adWalletTopUpUsd.toFixed(2)} to your prepaid ad balance`
        : `Select billing and complete payment for ${plan.name}`;

  const amountUsd =
    purpose === "ad_campaign" && adContext
      ? adContext.amountUsd
      : purpose === "ad_wallet"
        ? Math.round(adWalletTopUpUsd)
        : plan.monthlyPrice;

  async function startCheckout() {
    if (!teamId) return;
    setLoading(true);
    setStatus("");
    setCheckout(null);

    let res: Response;
    if (purpose === "ad_campaign" && campaignId) {
      res = await fetch("/api/billing/ad-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, campaignId, method: paymentMethod }),
      });
    } else if (purpose === "ad_wallet") {
      res = await fetch("/api/billing/ad-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, method: paymentMethod }),
      });
    } else {
      res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          planId: plan.id,
          interval: "MONTHLY",
          method: paymentMethod,
        }),
      });
    }

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
    const redirect =
      purpose === "ad_campaign"
        ? "/dashboard/ads"
        : purpose === "ad_wallet"
          ? "/dashboard/billing"
          : "/dashboard/billing";
    setStatus(data.message || "Payment verified. Redirecting...");
    setTimeout(() => {
      window.location.href = redirect;
    }, 1500);
  }

  const hasMethods =
    enabledMethods.USDT || enabledMethods.PAYPAL || enabledMethods.GCASH || enabledMethods.US_BANK;

  const backHref =
    purpose === "ad_campaign" ? "/dashboard/ads" : purpose === "ad_wallet" ? "/dashboard/billing" : "/";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {purpose === "subscription" ? <Badge>{plan.accountLimit} accounts</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4">
            {purpose === "ad_campaign" && adContext ? (
              <>
                <p className="text-sm text-muted-foreground">Ad campaign</p>
                <p className="mt-1 text-xl font-semibold">{adContext.campaign.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ad spend ${adContext.campaign.platformBudgetUsd.toFixed(2)} · Your charge $
                  {adContext.campaign.clientChargeUsd.toFixed(2)} (includes platform fee)
                </p>
              </>
            ) : purpose === "ad_wallet" ? (
              <>
                <p className="text-sm text-muted-foreground">Ad wallet top-up</p>
                <p className="mt-1 text-xl font-semibold">${adWalletTopUpUsd.toFixed(2)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prepaid balance for launching ads without paying each time at checkout.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="mt-1 text-xl font-semibold">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ${plan.monthlyPrice}/month or ${plan.yearlyPrice}/year
                </p>
              </>
            )}
          </div>

          {!checkout ? (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">
                Amount due: <strong>${amountUsd}</strong>
              </p>
              <p className="text-sm font-medium">Choose payment option</p>
              {hasMethods ? (
                <>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as ClientPaymentMethod)}
                  >
                    {enabledMethods.USDT ? (
                      <option value="USDT">USDT Crypto (TRC20 — auto verify)</option>
                    ) : null}
                    {enabledMethods.PAYPAL ? <option value="PAYPAL">PayPal</option> : null}
                    {enabledMethods.GCASH ? <option value="GCASH">GCash</option> : null}
                    {enabledMethods.US_BANK ? <option value="US_BANK">US Bank transfer</option> : null}
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
              {paymentMethod !== "USDT" ? (
                <p className="text-xs text-muted-foreground">
                  {purpose === "ad_campaign"
                    ? "After admin confirms payment, your ad will be submitted to the ad platform."
                    : purpose === "ad_wallet"
                      ? "After admin confirms payment, funds are added to your ad wallet in Billing."
                      : "Payment is reviewed manually. Your subscription activates after admin confirms."}
                </p>
              ) : null}
            </div>
          )}

          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

          <div className="flex items-center justify-between">
            <Button asChild variant="ghost">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            {purpose === "subscription" ? (
              <Button asChild variant="outline">
                <Link href={`/register?plan=${plan.id}`}>Register account</Link>
              </Button>
            ) : null}
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

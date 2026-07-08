"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { plans, type PlanId } from "@/lib/pricing";
import { UsdtPaymentHighlight } from "@/components/billing/usdt-payment-highlight";
import { BankPaymentHighlight } from "@/components/billing/bank-payment-highlight";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_ENABLED_METHODS,
  type ClientPaymentMethod,
  type EnabledPaymentMethods,
  type UsBankDetails,
  paymentMethodLabel,
} from "@/lib/payment-methods";

type PaymentMethod = ClientPaymentMethod;

type PlanPricingGridProps = {
  teamId: string | null;
  currentPlanId?: string | null;
  subscriptionStatus?: string | null;
  onCheckoutComplete?: () => void;
  showHeading?: boolean;
};

export function PlanPricingGrid({
  teamId,
  currentPlanId,
  subscriptionStatus,
  onCheckoutComplete,
  showHeading = true,
}: PlanPricingGridProps) {
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [pendingUsdt, setPendingUsdt] = useState<{
    paymentId: string;
    usdtAmount: number;
    walletAddress: string;
  } | null>(null);
  const [pendingBank, setPendingBank] = useState<{
    paymentId: string;
    amountUsd: number;
    bank: UsBankDetails;
    instructions: string;
  } | null>(null);
  const usdtHighlightRef = useRef<HTMLDivElement>(null);
  const [enabledMethods, setEnabledMethods] = useState<EnabledPaymentMethods>(DEFAULT_ENABLED_METHODS);

  useEffect(() => {
    fetch("/api/billing/payment-methods")
      .then((r) => r.json())
      .then((data) => {
        if (data.methods) setEnabledMethods(data.methods);
      })
      .catch(() => undefined);
  }, []);

  const hasPaymentMethods =
    enabledMethods.USDT ||
    enabledMethods.PAYPAL ||
    enabledMethods.GCASH ||
    enabledMethods.US_BANK;

  async function startCheckout(planId: PlanId, method: PaymentMethod) {
    if (!teamId) {
      setStatus("Select a workspace first.");
      return;
    }
    setLoadingPlan(`${planId}-${method}`);
    setStatus("");
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, planId, interval, method }),
    });
    const data = await res.json();
    setLoadingPlan(null);
    if (!res.ok) {
      setStatus(data.error || "Checkout failed");
      return;
    }
    if (method === "USDT") {
      setPendingBank(null);
      setPendingUsdt({
        paymentId: data.payment?.id,
        usdtAmount: data.usdtAmount,
        walletAddress: data.walletAddress,
      });
      setStatus("");
      setTimeout(() => usdtHighlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    } else if (method === "US_BANK" && data.usBank) {
      setPendingUsdt(null);
      setPendingBank({
        paymentId: data.payment?.id,
        amountUsd: data.payment?.amount || 0,
        bank: data.usBank,
        instructions: data.instructions || "",
      });
      setStatus("");
    } else {
      setPendingUsdt(null);
      setPendingBank(null);
      setStatus(`${plans.find((p) => p.id === planId)?.name} payment created (${paymentMethodLabel(method)}). ${data.instructions}`);
    }
    onCheckoutComplete?.();
  }

  return (
    <div className="space-y-6">
      {showHeading ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Plans & pricing</h2>
            <p className="text-muted-foreground">
              Pick a plan and pay with{" "}
              {[
                enabledMethods.USDT && "USDT",
                enabledMethods.PAYPAL && "PayPal",
                enabledMethods.GCASH && "GCash",
                enabledMethods.US_BANK && "US Bank",
              ]
                .filter(Boolean)
                .join(", ") || "your preferred method"}
            </p>
          </div>
          <div className="inline-flex rounded-lg border p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                interval === "MONTHLY" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setInterval("MONTHLY")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                interval === "YEARLY" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setInterval("YEARLY")}
            >
              Yearly
            </button>
          </div>
        </div>
      ) : null}

      {pendingUsdt ? (
        <div ref={usdtHighlightRef}>
          <UsdtPaymentHighlight
            paymentId={pendingUsdt.paymentId}
            usdtAmount={pendingUsdt.usdtAmount}
            walletAddress={pendingUsdt.walletAddress}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Go to <strong>Billing</strong> to paste your transaction hash and activate your plan.
          </p>
        </div>
      ) : null}

      {pendingBank && teamId ? (
        <BankPaymentHighlight
          paymentId={pendingBank.paymentId}
          teamId={teamId}
          amountUsd={pendingBank.amountUsd}
          bank={pendingBank.bank}
          instructions={pendingBank.instructions}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = interval === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice;
          const perMonth = interval === "YEARLY" ? plan.yearlyPerMonth : plan.monthlyPrice;
          const isCurrent = currentPlanId === plan.id && subscriptionStatus === "ACTIVE";
          const isTrial = currentPlanId === plan.id && subscriptionStatus === "TRIAL";

          return (
            <Card
              key={plan.id}
              className={plan.popular ? "border-primary shadow-[0_0_0_2px_rgba(124,58,237,0.2)]" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="flex flex-wrap gap-1">
                    {plan.popular ? <Badge>Popular</Badge> : null}
                    {isCurrent ? <Badge variant="success">Current plan</Badge> : null}
                    {isTrial ? <Badge variant="warning">Trial</Badge> : null}
                  </div>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">
                    ${price}
                    <span className="text-base font-normal text-muted-foreground">
                      /{interval === "YEARLY" ? "year" : "month"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ${perMonth}/mo · up to {plan.accountLimit} accounts
                  </p>
                  {interval === "MONTHLY" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Or ${plan.yearlyPrice}/year (save vs monthly)
                    </p>
                  ) : null}
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {hasPaymentMethods ? (
                  <div className="space-y-2">
                    {enabledMethods.USDT ? (
                      <Button
                        className="w-full"
                        disabled={!!loadingPlan}
                        onClick={() => startCheckout(plan.id, "USDT")}
                      >
                        {loadingPlan === `${plan.id}-USDT` ? "Processing..." : `Buy with USDT`}
                      </Button>
                    ) : null}
                    {enabledMethods.PAYPAL ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        disabled={!!loadingPlan}
                        onClick={() => startCheckout(plan.id, "PAYPAL")}
                      >
                        {loadingPlan === `${plan.id}-PAYPAL` ? "Processing..." : `Buy with PayPal`}
                      </Button>
                    ) : null}
                    {enabledMethods.GCASH ? (
                      <Button
                        className="w-full"
                        variant="secondary"
                        disabled={!!loadingPlan}
                        onClick={() => startCheckout(plan.id, "GCASH")}
                      >
                        {loadingPlan === `${plan.id}-GCASH` ? "Processing..." : `Buy with GCash`}
                      </Button>
                    ) : null}
                    {enabledMethods.US_BANK ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        disabled={!!loadingPlan}
                        onClick={() => startCheckout(plan.id, "US_BANK")}
                      >
                        {loadingPlan === `${plan.id}-US_BANK` ? "Processing..." : `Buy with US Bank`}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Payment methods are not available yet.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}

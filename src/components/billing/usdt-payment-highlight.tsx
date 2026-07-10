"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type UsdtPaymentHighlightProps = {
  usdtAmount: number;
  walletAddress: string;
  paymentId?: string;
  onVerifyClick?: () => void;
};

export function UsdtPaymentHighlight({
  usdtAmount,
  walletAddress,
  paymentId,
  onVerifyClick,
}: UsdtPaymentHighlightProps) {
  const [copied, setCopied] = useState<"amount" | "wallet" | "paymentId" | null>(null);

  async function copy(value: string, field: "amount" | "wallet" | "paymentId") {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-violet-50 to-purple-50 p-5 shadow-sm">
      <p className="text-sm font-semibold text-primary">USDT payment — send now</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Use the <strong>TRC20 (Tron)</strong> network only. Send the exact amount below.
      </p>

      <div className="mt-4 space-y-3">
        {paymentId ? (
          <div className="rounded-lg border border-primary/20 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payment ID
            </p>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-all font-mono text-sm font-semibold text-slate-900">{paymentId}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy(paymentId, "paymentId")}
              >
                {copied === "paymentId" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === "paymentId" ? "Copied" : "Copy ID"}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Keep this ID so you know which payment you are funding.
            </p>
          </div>
        ) : null}

        <div className="rounded-lg border border-primary/20 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-2xl font-bold text-primary">{usdtAmount} USDT</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copy(String(usdtAmount), "amount")}
            >
              {copied === "amount" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "amount" ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border-2 border-primary bg-white p-3 ring-2 ring-primary/20">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">TRC20 wallet address</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-all font-mono text-sm font-semibold text-slate-900">{walletAddress}</p>
            <Button
              type="button"
              size="sm"
              onClick={() => copy(walletAddress, "wallet")}
            >
              {copied === "wallet" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "wallet" ? "Copied" : "Copy wallet"}
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        After sending, paste your transaction hash {onVerifyClick ? "below" : "on the Billing page"} to activate
        your plan automatically.
      </p>
      {onVerifyClick ? (
        <Button type="button" className="mt-3" variant="secondary" size="sm" onClick={onVerifyClick}>
          Scroll to verify payment
        </Button>
      ) : null}
    </div>
  );
}

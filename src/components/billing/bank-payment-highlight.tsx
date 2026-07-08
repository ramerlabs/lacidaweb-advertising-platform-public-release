"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatTokenCount } from "@/lib/ai-pricing";
import type { UsBankDetails } from "@/lib/payment-methods";

export function BankPaymentHighlight({
  paymentId,
  teamId,
  amountUsd,
  tokensGranted,
  bank,
  instructions,
  onReferenceSubmitted,
}: {
  paymentId: string;
  teamId: string;
  amountUsd: number;
  tokensGranted?: number;
  bank: UsBankDetails;
  instructions?: string;
  onReferenceSubmitted?: () => void;
}) {
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function submitReference() {
    if (!reference.trim()) {
      setMessage("Enter your bank transfer reference.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const res = await fetch(`/api/billing/payments/${paymentId}/reference`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, reference: reference.trim() }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setMessage(data.error || "Could not submit reference");
      return;
    }
    setMessage(data.message || "Reference submitted.");
    onReferenceSubmitted?.();
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle>Complete your US bank transfer</CardTitle>
        <CardDescription>
          Pay <strong>${amountUsd.toFixed(2)}</strong>
          {tokensGranted !== undefined ? (
            <>
              {" "}
              → receive <strong>{tokensGranted.toLocaleString()}</strong> AI tokens (
              {formatTokenCount(tokensGranted)}) after approval
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-background p-4 text-sm">
          <p className="font-medium text-foreground">Wire or ACH to this US bank account</p>
          <dl className="mt-3 space-y-2 text-muted-foreground">
            <div className="flex justify-between gap-4">
              <dt>Bank</dt>
              <dd className="text-right font-medium text-foreground">{bank.bankName}</dd>
            </div>
            {bank.accountName ? (
              <div className="flex justify-between gap-4">
                <dt>Account name</dt>
                <dd className="text-right font-medium text-foreground">{bank.accountName}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt>Routing number</dt>
              <dd className="text-right font-mono font-medium text-foreground">{bank.routingNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Account number</dt>
              <dd className="text-right font-mono font-medium text-foreground">{bank.accountNumber}</dd>
            </div>
            {bank.accountType ? (
              <div className="flex justify-between gap-4">
                <dt>Account type</dt>
                <dd className="text-right font-medium text-foreground">{bank.accountType}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t pt-2">
              <dt>Amount</dt>
              <dd className="text-right text-lg font-bold text-primary">${amountUsd.toFixed(2)} USD</dd>
            </div>
          </dl>
        </div>

        {instructions ? (
          <pre className="whitespace-pre-wrap rounded-lg border bg-background p-3 text-xs leading-relaxed text-muted-foreground">
            {instructions}
          </pre>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="bank-reference">Payment reference</Label>
          <Input
            id="bank-reference"
            placeholder="Confirmation / trace / memo number from your bank"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter the reference from your bank transfer so we can match your payment.
          </p>
        </div>

        <Button disabled={submitting} onClick={submitReference}>
          {submitting ? "Submitting..." : "Submit reference"}
        </Button>

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

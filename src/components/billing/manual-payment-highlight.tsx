"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTokenCount } from "@/lib/ai-pricing";

export function ManualPaymentHighlight({
  method,
  amountUsd,
  tokensGranted,
  instructions,
}: {
  method: "PAYPAL" | "GCASH";
  amountUsd: number;
  tokensGranted?: number;
  instructions: string;
}) {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle>
          Complete your {method === "PAYPAL" ? "PayPal" : "GCash"} payment
        </CardTitle>
        <CardDescription>
          Pay <strong>${amountUsd.toFixed(2)}</strong>
          {tokensGranted !== undefined && tokensGranted > 0 ? (
            <>
              {" "}
              → receive <strong>{tokensGranted.toLocaleString()}</strong> AI tokens (
              {formatTokenCount(tokensGranted)}) after approval
            </>
          ) : (
            <> — wallet credits after approval</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap rounded-lg border bg-background p-4 text-sm leading-relaxed">
          {instructions}
        </pre>
      </CardContent>
    </Card>
  );
}

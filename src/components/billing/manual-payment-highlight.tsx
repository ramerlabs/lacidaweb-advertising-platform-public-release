"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ManualPaymentHighlight({
  method,
  amountUsd,
  creditsUsd,
  instructions,
}: {
  method: "PAYPAL" | "GCASH";
  amountUsd: number;
  creditsUsd?: number;
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
          {creditsUsd !== undefined ? (
            <>
              {" "}
              → receive <strong>${creditsUsd.toFixed(2)}</strong> AI credits after approval
            </>
          ) : null}
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

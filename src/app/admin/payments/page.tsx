"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Payment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  txHash?: string | null;
  team: { name: string };
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    const res = await fetch("/api/admin/payments");
    const data = await res.json();
    if (res.ok) setPayments(data.payments || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function reviewPayment(paymentId: string, action: "PAID" | "FAILED") {
    const res = await fetch(`/api/admin/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Payment update failed");
      return;
    }
    setStatus(`Payment marked ${action}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">Approve or reject incoming payments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment queue</CardTitle>
          <CardDescription>USDT payments with a valid hash are auto-approved. PayPal and GCash need manual review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment records yet.</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="rounded border p-3 text-sm">
                <p className="font-medium">{payment.team.name} - ${payment.amount}</p>
                <p className="text-muted-foreground">
                  {payment.method} - {payment.status}
                </p>
                {payment.txHash ? (
                  <p className="mt-1 break-all text-xs text-muted-foreground">TX: {payment.txHash}</p>
                ) : null}
                {payment.status === "PENDING" ? (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => reviewPayment(payment.id, "PAID")}>
                      Mark paid
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reviewPayment(payment.id, "FAILED")}>
                      Mark failed
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

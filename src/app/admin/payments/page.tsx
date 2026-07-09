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
  externalRef?: string | null;
  team: { name: string };
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

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

  async function deletePayment(paymentId: string) {
    const confirmed = window.confirm("Delete this payment record?");
    if (!confirmed) return;
    setDeletingId(paymentId);
    setStatus("");
    const res = await fetch(`/api/admin/payments/${paymentId}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);
    if (!res.ok) {
      setStatus(data.error || "Delete failed");
      return;
    }
    setStatus("Payment deleted");
    await load();
  }

  async function deleteAllPayments() {
    const confirmed = window.confirm(
      "Delete ALL payment records? This cannot be undone.",
    );
    if (!confirmed) return;
    setDeletingAll(true);
    setStatus("");
    const res = await fetch("/api/admin/payments", { method: "DELETE" });
    const data = await res.json();
    setDeletingAll(false);
    if (!res.ok) {
      setStatus(data.error || "Delete all failed");
      return;
    }
    setStatus(`Deleted ${data.deletedCount || 0} payment records`);
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
          <CardDescription>USDT auto-verifies with a hash. PayPal, GCash, and US Bank need manual review.</CardDescription>
          {payments.length > 0 ? (
            <div>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-300 text-rose-700"
                onClick={deleteAllPayments}
                disabled={deletingAll}
              >
                {deletingAll ? "Deleting all..." : "Delete all payments"}
              </Button>
            </div>
          ) : null}
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
                {payment.externalRef ? (
                  <p className="mt-1 text-xs text-muted-foreground">Bank reference: {payment.externalRef}</p>
                ) : null}
                {payment.status === "PENDING" ? (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => reviewPayment(payment.id, "PAID")}>
                      Mark paid
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reviewPayment(payment.id, "FAILED")}>
                      Mark failed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-300 text-rose-700"
                      onClick={() => deletePayment(payment.id)}
                      disabled={deletingId === payment.id}
                    >
                      {deletingId === payment.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-300 text-rose-700"
                      onClick={() => deletePayment(payment.id)}
                      disabled={deletingId === payment.id}
                    >
                      {deletingId === payment.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

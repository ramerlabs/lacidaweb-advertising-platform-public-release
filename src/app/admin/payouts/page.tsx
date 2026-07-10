"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Payout = {
  id: string;
  teamName: string;
  amountCents: number;
  method: string;
  status: string;
  payoutDetails: string;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "PAID" | "REJECTED">("PENDING");

  async function load() {
    setLoading(true);
    const qs = filter === "ALL" ? "" : `?status=${filter}`;
    const res = await fetch(`/api/admin/payouts${qs}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus(data.error || "Failed to load payouts");
      return;
    }
    setPayouts(data.payouts || []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function act(id: string, action: "APPROVE" | "REJECT" | "MARK_PAID") {
    setBusyId(id);
    setStatus("");
    let rejectionReason: string | undefined;
    if (action === "REJECT") {
      rejectionReason = window.prompt("Rejection reason") || "Rejected by admin";
    }
    const res = await fetch(`/api/admin/payouts?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectionReason }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setStatus(data.error || "Action failed");
      return;
    }
    setStatus(data.message || "Updated");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Publisher payouts</h1>
        <p className="text-muted-foreground">
          Review publisher withdrawal requests and mark them paid after you send funds.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["PENDING", "APPROVED", "PAID", "REJECTED", "ALL"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {value}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{filter === "ALL" ? "All payouts" : `${filter} payouts`}</CardTitle>
          <CardDescription>{payouts.length} requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts in this view.</p>
          ) : (
            payouts.map((payout) => (
              <div key={payout.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{money(payout.amountCents)}</p>
                      <Badge>{payout.status}</Badge>
                      <Badge variant="outline">{payout.method}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {payout.teamName} · {new Date(payout.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{payout.payoutDetails}</p>
                    {payout.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">Note: {payout.notes}</p>
                    ) : null}
                    {payout.rejectionReason ? (
                      <p className="mt-1 text-xs text-rose-600">{payout.rejectionReason}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {payout.status === "PENDING" ? (
                      <>
                        <Button
                          size="sm"
                          disabled={busyId === payout.id}
                          onClick={() => act(payout.id, "APPROVE")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === payout.id}
                          onClick={() => act(payout.id, "MARK_PAID")}
                        >
                          Mark paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-700"
                          disabled={busyId === payout.id}
                          onClick={() => act(payout.id, "REJECT")}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {payout.status === "APPROVED" ? (
                      <>
                        <Button
                          size="sm"
                          disabled={busyId === payout.id}
                          onClick={() => act(payout.id, "MARK_PAID")}
                        >
                          Mark paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-700"
                          disabled={busyId === payout.id}
                          onClick={() => act(payout.id, "REJECT")}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}

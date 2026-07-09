"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Campaign = {
  id: string;
  name: string;
  teamName: string;
  objective: string | null;
  lifecycleStatus: string;
  budgetAmount: number;
  budgetType: string;
  paymentStatus: string;
  createdAt: string;
  headline: string | null;
  imageUrl: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "danger" | "warning"> = {
  PENDING_REVIEW: "warning",
  APPROVED: "default",
  REJECTED: "danger",
  ACTIVE: "default",
  PAUSED: "secondary",
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/campaigns");
    const data = await res.json();
    if (res.ok) setCampaigns(data.campaigns || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = campaigns.find((c) => c.id === selectedId) || null;

  async function review(action: "APPROVED" | "REJECTED") {
    if (!selected) return;
    setMessage("");
    const res = await fetch(`/api/admin/campaigns?id=${encodeURIComponent(selected.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes: notes || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Review failed");
      return;
    }
    setMessage(action === "APPROVED" ? "Campaign approved" : "Campaign rejected");
    setNotes("");
    setSelectedId(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaign review</h1>
        <p className="text-muted-foreground">Approve or reject advertiser campaigns before they go live</p>
      </div>

      {message ? (
        <p className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-800 dark:text-cyan-200">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Queue</CardTitle>
            <CardDescription>{loading ? "Loading..." : `${campaigns.length} campaigns`}</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[520px] space-y-2 overflow-y-auto">
            {campaigns.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">No campaigns submitted yet.</p>
            ) : null}
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                onClick={() => setSelectedId(campaign.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedId === campaign.id
                    ? "border-cyan-500/50 bg-cyan-500/5"
                    : "hover:border-zinc-300 hover:bg-muted/50 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.teamName} · ${campaign.budgetAmount} {campaign.budgetType}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[campaign.lifecycleStatus] || "outline"}>
                    {campaign.lifecycleStatus.replace(/_/g, " ")}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Review</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a campaign to review.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold">{selected.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selected.teamName} · {selected.objective} · {selected.paymentStatus}
                  </p>
                </div>
                {selected.headline ? (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <p className="font-medium">{selected.headline}</p>
                  </div>
                ) : null}
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.imageUrl} alt="" className="max-h-40 rounded-lg object-cover" />
                ) : null}
                <Textarea
                  placeholder="Rejection notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => review("APPROVED")} className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
                    Approve
                  </Button>
                  <Button variant="outline" onClick={() => review("REJECTED")}>
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

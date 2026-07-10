"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Campaign = {
  id: string;
  name: string;
  teamId: string;
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
  const [busy, setBusy] = useState(false);
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

  async function runAction(action: "APPROVED" | "REJECTED" | "PAUSE" | "RESUME" | "DELETE") {
    if (!selected) return;
    if (action === "DELETE") {
      const ok = window.confirm(
        `Delete campaign "${selected.name}" for ${selected.teamName}? This cannot be undone.`,
      );
      if (!ok) return;
    }
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/admin/campaigns?id=${encodeURIComponent(selected.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes: notes || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Action failed");
      return;
    }
    const labels: Record<string, string> = {
      APPROVED: "Campaign approved",
      REJECTED: "Campaign rejected",
      PAUSE: "Campaign paused",
      RESUME: "Campaign resumed",
      DELETE: "Campaign deleted",
    };
    setMessage(labels[action] || "Updated");
    setNotes("");
    if (action === "DELETE") setSelectedId(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaign review</h1>
        <p className="text-muted-foreground">
          Approve, reject, pause, or delete advertiser campaigns
        </p>
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
            <CardTitle className="text-lg">Manage</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a campaign to manage.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold">{selected.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selected.teamName} · {selected.objective} · {selected.paymentStatus}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Status: {selected.lifecycleStatus.replace(/_/g, " ")}
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
                  {selected.lifecycleStatus === "PENDING_REVIEW" ? (
                    <>
                      <Button
                        disabled={busy}
                        onClick={() => runAction("APPROVED")}
                        className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
                      >
                        Approve
                      </Button>
                      <Button variant="outline" disabled={busy} onClick={() => runAction("REJECTED")}>
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {["ACTIVE", "APPROVED"].includes(selected.lifecycleStatus) ? (
                    <Button variant="outline" disabled={busy} onClick={() => runAction("PAUSE")}>
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                  ) : null}
                  {selected.lifecycleStatus === "PAUSED" ? (
                    <Button variant="outline" disabled={busy} onClick={() => runAction("RESUME")}>
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    className="border-rose-300 text-rose-700"
                    disabled={busy}
                    onClick={() => runAction("DELETE")}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
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

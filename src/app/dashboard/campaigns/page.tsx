"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Megaphone, Pause, Play, Plus, Trash2 } from "lucide-react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignDto } from "@/types/lacidaweb";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

function statusVariant(status: string): "default" | "secondary" | "outline" | "danger" {
  if (status === "ACTIVE" || status === "APPROVED") return "default";
  if (status === "REJECTED") return "danger";
  if (status === "PENDING_REVIEW") return "secondary";
  return "outline";
}

export default function CampaignsPage() {
  const { teamId } = useTeam();
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns?teamId=${encodeURIComponent(teamId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load campaigns");
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pauseOrResume(campaign: CampaignDto, action: "PAUSE" | "RESUME") {
    if (!teamId) return;
    setBusyId(campaign.id);
    setStatus("");
    const res = await fetch(`/api/campaigns/${encodeURIComponent(campaign.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, action }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setStatus(typeof data.error === "string" ? data.error : "Update failed");
      return;
    }
    setStatus(data.message || (action === "PAUSE" ? "Campaign paused" : "Campaign resumed"));
    await load();
  }

  async function removeCampaign(campaign: CampaignDto) {
    if (!teamId) return;
    const ok = window.confirm(
      `Delete campaign "${campaign.name}"? This permanently removes the campaign and its ads.`,
    );
    if (!ok) return;
    setBusyId(campaign.id);
    setStatus("");
    const res = await fetch(
      `/api/campaigns/${encodeURIComponent(campaign.id)}?teamId=${encodeURIComponent(teamId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      },
    );
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setStatus(typeof data.error === "string" ? data.error : "Delete failed");
      return;
    }
    setStatus("Campaign deleted");
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage awareness, traffic, and conversion campaigns.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/campaigns/new">
            <Plus className="h-4 w-4" />
            Create campaign
          </Link>
        </Button>
      </div>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      ) : null}
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading campaigns...
          </CardContent>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5 text-primary" />
              No campaigns yet
            </CardTitle>
            <CardDescription>
              Launch your first campaign with our guided wizard — pick an objective, define your
              audience, set a budget, and upload your creative.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/campaigns/new">Create your first campaign</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const canPause = ["ACTIVE", "APPROVED"].includes(campaign.lifecycleStatus);
            const canResume = campaign.lifecycleStatus === "PAUSED";
            const busy = busyId === campaign.id;
            return (
              <Card key={campaign.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {campaign.objective?.replace("_", " ") || campaign.goal} · $
                      {campaign.budgetAmount.toFixed(2)}{" "}
                      {campaign.budgetType === "daily" ? "daily" : "lifetime"}
                    </CardDescription>
                  </div>
                  <Badge variant={statusVariant(campaign.lifecycleStatus)}>
                    {STATUS_LABELS[campaign.lifecycleStatus] || campaign.lifecycleStatus}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Countries: {campaign.targeting?.location.countries.join(", ") || "—"}
                    </span>
                    <span>Payment: {campaign.paymentStatus.replace(/_/g, " ")}</span>
                    <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                    {campaign.ads[0]?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={campaign.ads[0].imageUrl}
                        alt=""
                        className="ml-auto h-14 w-20 rounded object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canPause ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => pauseOrResume(campaign, "PAUSE")}
                      >
                        <Pause className="h-4 w-4" />
                        {busy ? "Working..." : "Pause"}
                      </Button>
                    ) : null}
                    {canResume ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => pauseOrResume(campaign, "RESUME")}
                      >
                        <Play className="h-4 w-4" />
                        {busy ? "Working..." : "Resume"}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      disabled={busy}
                      onClick={() => removeCampaign(campaign)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
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

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    fetch(`/api/campaigns?teamId=${encodeURIComponent(teamId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCampaigns(data.campaigns || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load campaigns"))
      .finally(() => setLoading(false));
  }, [teamId]);

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
          {campaigns.map((campaign) => (
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
              <CardContent className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

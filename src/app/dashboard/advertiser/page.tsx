"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus, TrendingUp, Wallet } from "lucide-react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type OverviewStats = {
  walletBalanceUsd: string;
  totalCampaigns: number;
  pendingReview: number;
  activeCampaigns: number;
  recentCampaigns: Array<{
    id: string;
    name: string;
    lifecycleStatus: string;
    objective: string | null;
    budgetAmount: number;
    budgetType: string;
    paymentStatus: string;
    createdAt: string;
  }>;
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
};

export default function AdvertiserDashboardPage() {
  const { teamId } = useTeam();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    fetch(`/api/dashboard/overview?teamId=${encodeURIComponent(teamId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            Advertiser
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Advertising overview</h1>
          <p className="text-muted-foreground">Campaigns, wallet balance, and ad performance</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/campaigns/new">
            <Plus className="h-4 w-4" />
            New campaign
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-card to-emerald-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet balance
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {loading ? "—" : `$${stats?.walletBalanceUsd ?? "0.00"}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/wallet">Top up wallet</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Total campaigns
            </CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : stats?.totalCampaigns ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending review</CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : stats?.pendingReview ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Active campaigns
            </CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : stats?.activeCampaigns ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {stats && Number(stats.walletBalanceUsd) === 0 ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-lg">Fund your wallet to run ads</CardTitle>
            <CardDescription>
              Campaigns require wallet balance after approval. Top up with USDT, GCash, PayPal, or bank
              transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/wallet">Add funds</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Recent campaigns</CardTitle>
            <CardDescription>Your latest lacidaweb ad campaigns</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/campaigns">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !stats?.recentCampaigns.length ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/dashboard/campaigns/new">Create your first campaign</Link>
              </Button>
            </div>
          ) : (
            stats.recentCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{campaign.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {campaign.objective?.replace("_", " ") || "Campaign"} · $
                    {campaign.budgetAmount.toFixed(2)}{" "}
                    {campaign.budgetType === "daily" ? "daily" : "lifetime"}
                  </p>
                </div>
                <Badge variant={campaign.lifecycleStatus === "ACTIVE" ? "default" : "secondary"}>
                  {STATUS_LABELS[campaign.lifecycleStatus] || campaign.lifecycleStatus}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

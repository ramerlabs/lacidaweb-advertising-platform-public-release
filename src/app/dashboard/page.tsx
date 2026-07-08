"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTeam } from "@/components/dashboard/team-provider";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { PlanPricingGrid } from "@/components/dashboard/plan-pricing-grid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type OverviewData = {
  accounts: number;
  activity: Array<{ id: string; content: string; status: string }>;
  activityMeta: { realCount: number; displayCount: number };
  unread: number;
};

type Subscription = {
  planId: string;
  status: string;
  accountLimit: number;
  amount: number;
  interval: string;
} | null;

export default function DashboardPage() {
  const { teamId } = useTeam();
  const [data, setData] = useState<OverviewData>({
    accounts: 0,
    activity: [],
    activityMeta: { realCount: 0, displayCount: 20 },
    unread: 0,
  });
  const [subscription, setSubscription] = useState<Subscription>(null);

  async function load() {
    if (!teamId) return;
    const [accountsRes, activityRes, inboxRes, subRes] = await Promise.all([
      fetch(`/api/accounts?teamId=${teamId}`),
      fetch(`/api/dashboard/activity?teamId=${teamId}`),
      fetch(`/api/inbox?teamId=${teamId}`),
      fetch(`/api/billing/subscription?teamId=${teamId}`),
    ]);
    const accounts = await accountsRes.json();
    const activity = await activityRes.json();
    const inbox = await inboxRes.json();
    const subData = await subRes.json();
    setData({
      accounts: accounts.accounts?.length || 0,
      activity: activity.items || [],
      activityMeta: {
        realCount: activity.meta?.realCount || 0,
        displayCount: activity.meta?.displayCount || 20,
      },
      unread: (inbox.items || []).filter((i: { status: string }) => i.status === "UNREAD").length,
    });
    setSubscription(subData.subscription || null);
  }

  useEffect(() => {
    load();
  }, [teamId]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Your multi-channel publishing and engagement snapshot</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/compose">New post</Link>
        </Button>
      </div>

      <OnboardingChecklist />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Connected accounts</CardDescription>
            <CardTitle className="text-3xl">{data.accounts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Unread inbox</CardDescription>
            <CardTitle className="text-3xl">{data.unread}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Your posts tracked</CardDescription>
            <CardTitle className="text-3xl">{data.activityMeta.realCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!subscription || subscription.status !== "ACTIVE" ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-lg">
              {!subscription ? "You're on the free plan" : "Activate your plan"}
            </CardTitle>
            <CardDescription>
              {!subscription
                ? "Explore the full dashboard for free. Upgrade below anytime to unlock higher account limits and priority support."
                : subscription.status === "TRIAL"
                  ? "You're exploring with trial access. Choose a plan below when you're ready to upgrade."
                  : "Your subscription needs payment. Pick a plan and complete checkout."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <PlanPricingGrid
        teamId={teamId}
        currentPlanId={subscription?.planId}
        subscriptionStatus={subscription?.status}
        onCheckoutComplete={load}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent publishing activity</CardTitle>
          <CardDescription>Draft, pending, scheduled, published, and failed states</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[520px] space-y-3 overflow-y-auto">
          {data.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts yet. Compose your first multi-platform update.</p>
          ) : (
            data.activity.map((post) => (
              <div key={post.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                <p className="text-sm">{post.content.slice(0, 120) || "(media-only post)"}</p>
                <Badge
                  variant={
                    post.status === "PUBLISHED"
                      ? "success"
                      : post.status === "FAILED"
                        ? "danger"
                        : post.status === "SCHEDULED"
                          ? "warning"
                          : "secondary"
                  }
                >
                  {post.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

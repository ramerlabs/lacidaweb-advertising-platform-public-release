"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Code2, Globe, MousePointerClick, Plus, Eye } from "lucide-react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PublisherStats = {
  sites: number;
  placements: number;
  impressions: number;
  clicks: number;
  ctr: string;
  recentPlacements: Array<{
    id: string;
    name: string;
    placementKey: string;
    impressions: number;
    clicks: number;
    site: { name: string; domain: string };
  }>;
};

export default function PublisherDashboardPage() {
  const { teamId } = useTeam();
  const [stats, setStats] = useState<PublisherStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    fetch(`/api/dashboard/publisher-overview?teamId=${encodeURIComponent(teamId)}`)
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
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Publisher
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Monetize your website</h1>
          <p className="text-muted-foreground">
            Register your site, choose ad types, and copy each unit&apos;s embed code
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-500">
          <Link href="/dashboard/publisher/sites">
            <Plus className="h-4 w-4" />
            Add website
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-cyan-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Websites
            </CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : stats?.sites ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Ad placements
            </CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : stats?.placements ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Impressions
            </CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : stats?.impressions ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              CTR
            </CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : `${stats?.ctr ?? "0.00"}%`}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!loading && stats?.sites === 0 ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-lg">Add your website to start earning</CardTitle>
            <CardDescription>
              Register your domain, choose an ad size, and paste the embed snippet into your site
              HTML. Active advertiser campaigns will fill your placements automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-500">
              <Link href="/dashboard/publisher/sites">Register website</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <QuickAction
          href="/dashboard/publisher/templates"
          icon={Code2}
          title="Ad templates"
          description="Display & text ad formats with embed code"
        />
        <QuickAction
          href="/dashboard/publisher/sites"
          icon={Globe}
          title="My websites"
          description="Manage domains and placements"
        />
        <QuickAction
          href="/dashboard/publisher/sites"
          icon={Code2}
          title="Embed code"
          description="Copy HTML or WordPress PHP per ad type"
        />
        <QuickAction
          href="/dashboard/publisher/performance"
          icon={BarChart3}
          title="Performance"
          description="Impressions, clicks, and CTR by placement"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent placements</CardTitle>
          <CardDescription>Your latest ad units across registered websites</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !stats?.recentPlacements.length ? (
            <p className="text-sm text-muted-foreground">No placements yet.</p>
          ) : (
            stats.recentPlacements.map((placement) => (
              <div
                key={placement.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{placement.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {placement.site.name} · {placement.site.domain}
                  </p>
                </div>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {placement.impressions} views · {placement.clicks} clicks
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-4 shadow-sm transition hover:border-emerald-500/30 hover:shadow-md"
    >
      <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      <p className="mt-3 font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
        {title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlacementRow = {
  id: string;
  name: string;
  placementKey: string;
  width: number;
  height: number;
  impressions: number;
  clicks: number;
  site: { name: string; domain: string };
};

export default function PublisherPerformancePage() {
  const { teamId } = useTeam();
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [summary, setSummary] = useState({ impressions: 0, clicks: 0, ctr: "0.00" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    Promise.all([
      fetch(`/api/dashboard/publisher-overview?teamId=${encodeURIComponent(teamId)}`).then((r) =>
        r.json(),
      ),
      fetch(`/api/publisher/sites?teamId=${encodeURIComponent(teamId)}`).then((r) => r.json()),
    ])
      .then(([overview, sitesData]) => {
        if (!overview.error) {
          setSummary({
            impressions: overview.impressions ?? 0,
            clicks: overview.clicks ?? 0,
            ctr: overview.ctr ?? "0.00",
          });
        }
        if (!sitesData.error) {
          const all: PlacementRow[] = (sitesData.sites || []).flatMap(
            (site: { name: string; domain: string; placements: PlacementRow[] }) =>
              site.placements.map((p) => ({
                ...p,
                site: { name: site.name, domain: site.domain },
              })),
          );
          setPlacements(all);
        }
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Publisher
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Ad performance</h1>
        <p className="text-muted-foreground">Impressions and clicks across your embedded ad units</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total impressions</CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : summary.impressions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total clicks</CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : summary.clicks}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Click-through rate</CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : `${summary.ctr}%`}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By placement</CardTitle>
          <CardDescription>Stats per embed unit on your websites</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : placements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No data yet. Add a website and embed the code to start tracking.
            </p>
          ) : (
            placements.map((p) => {
              const ctr =
                p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : "0.00";
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.site.domain} · {p.width}×{p.height}
                    </p>
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    <p>{p.impressions} impressions</p>
                    <p className="text-muted-foreground">
                      {p.clicks} clicks · {ctr}% CTR
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

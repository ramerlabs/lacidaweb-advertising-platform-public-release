"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildEmbedSnippet, buildWpPlacementPhpSnippet } from "@/lib/publisher-embed";
import { PUBLISHER_AD_TEMPLATES } from "@/lib/publisher-ad-templates";
import { AdTemplatePreview } from "@/components/publisher/ad-template-preview";

type Placement = {
  id: string;
  name: string;
  placementKey: string;
  width: number;
  height: number;
  format: string;
  impressions: number;
  clicks: number;
};

type Site = {
  id: string;
  name: string;
  domain: string;
  status: string;
  autoAdsEnabled: boolean;
  autoAdsKey: string | null;
  placements: Placement[];
};

export default function PublisherSitesPage() {
  const { teamId } = useTeam();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedWpKey, setCopiedWpKey] = useState<string | null>(null);
  const [addingForSite, setAddingForSite] = useState<string | null>(null);
  const [addTemplateId, setAddTemplateId] = useState("banner");
  const [busyAdd, setBusyAdd] = useState(false);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [preset, setPreset] = useState("banner");

  async function load() {
    if (!teamId) return;
    setLoading(true);
    const res = await fetch(`/api/publisher/sites?teamId=${encodeURIComponent(teamId)}`);
    const data = await res.json();
    if (res.ok) setSites(data.sites || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [teamId]);

  async function addSite(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) return;
    setStatus("");
    const res = await fetch("/api/publisher/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, name, domain, preset }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Failed to add website");
      return;
    }
    setName("");
    setDomain("");
    setStatus("Website registered — copy the embed code for your chosen ad type below");
    await load();
  }

  async function addPlacement(siteId: string) {
    if (!teamId) return;
    setBusyAdd(true);
    setStatus("");
    const template = PUBLISHER_AD_TEMPLATES.find((t) => t.id === addTemplateId);
    const res = await fetch("/api/publisher/placements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        siteId,
        templateId: addTemplateId,
        name: template?.name || "Ad unit",
      }),
    });
    const data = await res.json();
    setBusyAdd(false);
    if (!res.ok) {
      setStatus(data.error || "Failed to add ad type");
      return;
    }
    setAddingForSite(null);
    setStatus(`Added ${template?.name || "ad unit"} — copy its embed code below`);
    await load();
  }

  async function copySnippet(placementKey: string) {
    const snippet = buildEmbedSnippet(placementKey);
    await navigator.clipboard.writeText(snippet);
    setCopiedKey(placementKey);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function copyWpSnippet(placementKey: string) {
    const snippet = buildWpPlacementPhpSnippet(placementKey);
    await navigator.clipboard.writeText(snippet);
    setCopiedWpKey(placementKey);
    setTimeout(() => setCopiedWpKey(null), 2000);
  }

  function manualPlacements(site: Site) {
    return site.placements.filter((placement) => !placement.name.startsWith("Auto —"));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Publisher
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Websites & embed code</h1>
        <p className="text-muted-foreground">
          Register your domain, choose the ad types you want, then copy each unit&apos;s embed code
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Register a website
          </CardTitle>
          <CardDescription>
            Pick the first ad type you want. You can add more formats after the site is created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addSite} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site-name">Site name</Label>
              <Input
                id="site-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Blog"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-domain">Domain</Label>
              <Input
                id="site-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="preset">First ad type</Label>
              <select
                id="preset"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PUBLISHER_AD_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.category === "text" ? "(text)" : `(${t.width}×${t.height})`} —{" "}
                    {t.description}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Preview all formats on{" "}
                <a href="/dashboard/publisher/templates" className="text-emerald-600 underline">
                  Ad templates
                </a>
              </p>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500">
                Add website
              </Button>
            </div>
          </form>
          {status ? <p className="mt-3 text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading websites...</p>
      ) : sites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No websites registered yet. Add your first site above and choose an ad type.
          </CardContent>
        </Card>
      ) : (
        sites.map((site) => {
          const placements = manualPlacements(site);
          return (
            <Card key={site.id}>
              <CardHeader>
                <CardTitle>{site.name}</CardTitle>
                <CardDescription>
                  {site.domain}
                  {site.status !== "ACTIVE" ? ` · ${site.status}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
                  <p className="font-medium">How to use your ad codes</p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
                    <li>
                      Choose an ad type below (banner, text box, etc.) — each has its own embed code.
                    </li>
                    <li>
                      Copy the HTML snippet (or WordPress PHP) for that unit and place it where you
                      want that ad to appear on <strong className="text-foreground">{site.domain}</strong>.
                    </li>
                    <li>
                      If your account requires domain approval, the page host must match this
                      registered domain (or an allowlisted host set by admin).
                    </li>
                    <li>
                      Check{" "}
                      <a href="/dashboard/publisher/performance" className="text-emerald-600 underline">
                        Performance
                      </a>{" "}
                      for impressions and clicks.
                    </li>
                  </ol>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium">Your ad units</p>
                  {addingForSite === site.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={addTemplateId}
                        onChange={(e) => setAddTemplateId(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {PUBLISHER_AD_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500"
                        disabled={busyAdd}
                        onClick={() => addPlacement(site.id)}
                      >
                        {busyAdd ? "Adding..." : "Add"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setAddingForSite(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddingForSite(site.id);
                        setAddTemplateId("banner");
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add another ad type
                    </Button>
                  )}
                </div>

                {placements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No ad units yet. Add an ad type above to get an embed code.
                  </p>
                ) : (
                  placements.map((placement) => {
                    const snippet = buildEmbedSnippet(placement.placementKey);
                    const wpSnippet = buildWpPlacementPhpSnippet(placement.placementKey);
                    const template = PUBLISHER_AD_TEMPLATES.find(
                      (t) => t.format === placement.format,
                    );
                    return (
                      <div
                        key={placement.id}
                        className="space-y-3 rounded-lg border border-emerald-500/20 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{placement.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {placement.format.replace(/_/g, " ")}
                              {placement.width > 0
                                ? ` · ${placement.width}×${placement.height}`
                                : " · text"}
                              {" · "}
                              {placement.impressions} impressions · {placement.clicks} clicks
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500"
                              onClick={() => copySnippet(placement.placementKey)}
                            >
                              {copiedKey === placement.placementKey ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  Copy HTML
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => copyWpSnippet(placement.placementKey)}
                            >
                              {copiedWpKey === placement.placementKey ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  Copied PHP
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  Copy WordPress PHP
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        {template ? (
                          <div className="rounded-lg border border-dashed bg-muted/30 p-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                              Preview of this ad type (sample — live ads come from approved campaigns)
                            </p>
                            <AdTemplatePreview template={template} compact />
                          </div>
                        ) : null}
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">HTML embed</p>
                          <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs text-emerald-300">
                            {snippet}
                          </pre>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            WordPress PHP (optional)
                          </p>
                          <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-3 text-[11px] leading-relaxed text-emerald-300/90">
                            {wpSnippet}
                          </pre>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Place this where you want a <strong>{placement.name}</strong> unit on{" "}
                          {site.domain}. It only fills with matching campaign creatives when available.
                        </p>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

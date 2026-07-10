"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildEmbedSnippet } from "@/lib/publisher-embed";
import { buildAutoEmbedSnippet, buildWpAutoAdsPhpSnippet } from "@/lib/publisher-auto-ads";
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
  const [copiedAutoKey, setCopiedAutoKey] = useState<string | null>(null);
  const [copiedWpKey, setCopiedWpKey] = useState<string | null>(null);

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
    setStatus("Website registered — copy your embed code below");
    await load();
  }

  async function copySnippet(placementKey: string) {
    const snippet = buildEmbedSnippet(placementKey);
    await navigator.clipboard.writeText(snippet);
    setCopiedKey(placementKey);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function copyAutoSnippet(autoAdsKey: string) {
    const snippet = buildAutoEmbedSnippet(autoAdsKey);
    await navigator.clipboard.writeText(snippet);
    setCopiedAutoKey(autoAdsKey);
    setTimeout(() => setCopiedAutoKey(null), 2000);
  }

  async function copyWpSnippet(autoAdsKey: string) {
    const snippet = buildWpAutoAdsPhpSnippet(autoAdsKey);
    await navigator.clipboard.writeText(snippet);
    setCopiedWpKey(autoAdsKey);
    setTimeout(() => setCopiedWpKey(null), 2000);
  }

  async function toggleAutoAds(site: Site, enabled: boolean) {
    if (!teamId) return;
    setStatus("");
    const res = await fetch(`/api/publisher/sites/${site.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, autoAdsEnabled: enabled }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Failed to update automatic ads");
      return;
    }
    setStatus(enabled ? "Automatic ads enabled" : "Automatic ads disabled");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Publisher
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Websites & embed code</h1>
        <p className="text-muted-foreground">
          Paste the snippet into your site where you want lacidaweb ads to appear
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Register a website
          </CardTitle>
          <CardDescription>
            We&apos;ll create your first ad placement and generate the embed code automatically
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
              <Label htmlFor="preset">Starting ad template</Label>
              <select
                id="preset"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PUBLISHER_AD_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.category === "text" ? "(text)" : `(${t.width}×${t.height})`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Browse all formats on{" "}
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
            No websites registered yet. Add your first site above to get an embed snippet.
          </CardContent>
        </Card>
      ) : (
        sites.map((site) => (
          <Card key={site.id}>
            <CardHeader>
              <CardTitle>{site.name}</CardTitle>
              <CardDescription>{site.domain}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">Automatic ads (recommended)</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      One script — like Google Auto ads. lacidaweb places banners and text units in your
                      content automatically (top, in-article, end).
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={site.autoAdsEnabled}
                      onChange={(e) => toggleAutoAds(site, e.target.checked)}
                    />
                    Enabled
                  </label>
                </div>
                {site.autoAdsEnabled && site.autoAdsKey ? (
                  <>
                    <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs text-emerald-300">
                      {buildAutoEmbedSnippet(site.autoAdsKey)}
                    </pre>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => site.autoAdsKey && copyAutoSnippet(site.autoAdsKey)}
                      >
                        {copiedAutoKey === site.autoAdsKey ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy automatic ads code
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => site.autoAdsKey && copyWpSnippet(site.autoAdsKey)}
                      >
                        {copiedWpKey === site.autoAdsKey ? (
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

                    <div className="space-y-3 rounded-lg border bg-background/80 p-4 text-sm">
                      <p className="font-medium">How to install on {site.domain}</p>
                      <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                        <li>
                          Keep this site registered here as <strong className="text-foreground">{site.domain}</strong>.
                          Use the same domain visitors see in the browser (www is optional).
                        </li>
                        <li>
                          <strong className="text-foreground">Any website:</strong> copy the automatic ads
                          code above and paste it once before the closing{" "}
                          <code className="text-foreground">&lt;/body&gt;</code> tag.
                        </li>
                        <li>
                          <strong className="text-foreground">WordPress:</strong> copy the WordPress PHP
                          snippet and add it to your theme&apos;s{" "}
                          <code className="text-foreground">functions.php</code>, or put it in a small
                          custom plugin. Ads load in the footer on public pages only.
                        </li>
                        <li>
                          Publish a page, hard-refresh, and confirm ads appear. Earnings show under{" "}
                          <a href="/dashboard/publisher/performance" className="text-emerald-600 underline">
                            Performance
                          </a>
                          .
                        </li>
                      </ol>
                      <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-3 text-[11px] leading-relaxed text-emerald-300/90">
                        {buildWpAutoAdsPhpSnippet(site.autoAdsKey)}
                      </pre>
                      <p className="text-xs text-muted-foreground">
                        This code is unique to your account. Do not share it publicly if you want only
                        your sites to earn. Manual placements below are optional fixed slots.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Turn on automatic ads or use manual embed codes below.
                  </p>
                )}
              </div>

              <p className="text-sm font-medium text-muted-foreground">Manual placements (optional)</p>
              {site.placements
                .filter((placement) => !placement.name.startsWith("Auto —"))
                .map((placement) => {
                const snippet = buildEmbedSnippet(placement.placementKey);
                const template = PUBLISHER_AD_TEMPLATES.find((t) => t.format === placement.format);
                return (
                  <div key={placement.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{placement.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {placement.format.replace("_", " ")}
                          {placement.width > 0 ? ` · ${placement.width}×${placement.height}` : " · text"}
                          {" · "}
                          {placement.impressions} impressions · {placement.clicks} clicks
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
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
                            Copy embed code
                          </>
                        )}
                      </Button>
                    </div>
                    {template ? (
                      <div className="rounded-lg border border-dashed bg-muted/30 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Layout preview (sample content — live ads come from approved campaigns)
                        </p>
                        <AdTemplatePreview template={template} compact />
                      </div>
                    ) : null}
                    <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs text-emerald-300">
                      {snippet}
                    </pre>
                    <p className="text-xs text-muted-foreground">
                      Paste this before the closing <code>&lt;/body&gt;</code> tag on {site.domain}. Ads
                      from active lacidaweb campaigns will fill this slot automatically.
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

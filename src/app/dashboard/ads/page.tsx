"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTeam } from "@/components/dashboard/team-provider";
import { AD_GOALS, AD_PLATFORMS } from "@/lib/ads-platforms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Sparkles, X } from "lucide-react";
import { toClientFacingMessage } from "@/lib/client-errors";

type AdsConnection = {
  id: string;
  platform: string;
  zernioAccountId: string;
  username: string | null;
  displayName: string | null;
};

type AdAccount = { id: string; name: string; currency: string; status: string };

type CampaignRow = {
  platformCampaignId?: string;
  campaignName?: string;
  platform?: string;
  status?: string;
  budget?: { amount?: number; type?: string };
  metrics?: { spend?: number; impressions?: number; clicks?: number };
};

type LocalCampaign = {
  id: string;
  name: string;
  platform: string;
  status: string;
  goal: string;
  budgetAmount: number;
  budgetType: string;
  clientChargeUsd: number;
  paymentStatus?: string;
  platformCampaignId: string | null;
  createdAt: string;
};

export default function AdsPage() {
  const { teamId } = useTeam();
  const [connections, setConnections] = useState<AdsConnection[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [localCampaigns, setLocalCampaigns] = useState<LocalCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAd, setGeneratingAd] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [adsLoaded, setAdsLoaded] = useState(false);

  const [form, setForm] = useState({
    connectedAccountId: "",
    adAccountId: "",
    name: "Summer Sale Campaign",
    goal: "engagement",
    body: "",
    headline: "",
    linkUrl: "",
    imageUrl: "",
    budgetAmount: "5",
    budgetType: "daily" as "daily" | "lifetime",
    countries: "US",
  });

  async function load() {
    if (!teamId) return;
    setLoading(true);
    const [connRes, campRes] = await Promise.all([
      fetch(`/api/ads/accounts?teamId=${teamId}`),
      fetch(`/api/ads/campaigns?teamId=${teamId}`),
    ]);
    const connData = await connRes.json();
    const campData = await campRes.json();
    setConnections(connData.connections || []);
    setCampaigns(campData.campaigns || []);
    setLocalCampaigns(campData.localCampaigns || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [teamId]);

  useEffect(() => {
    fetch("/api/ads/settings")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.adsEnabled === "boolean") setAdsEnabled(data.adsEnabled);
      })
      .catch(() => {})
      .finally(() => setAdsLoaded(true));
  }, []);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/ai/generate?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => {
        setAiReady(Boolean(data.aiEnabled && data.teamAiEnabled));
        setTokenBalance(data.tokenBalance || 0);
      })
      .catch(() => {});
  }, [teamId]);

  useEffect(() => {
    if (!teamId || !form.connectedAccountId) {
      setAdAccounts([]);
      return;
    }
    const conn = connections.find((c) => c.id === form.connectedAccountId);
    if (!conn) return;
    fetch(`/api/ads/accounts?teamId=${teamId}&zernioAccountId=${conn.zernioAccountId}`)
      .then((r) => r.json())
      .then((d) => {
        setAdAccounts(d.adAccounts || []);
        if (d.adAccounts?.[0] && !form.adAccountId) {
          setForm((f) => ({ ...f, adAccountId: d.adAccounts[0].id }));
        }
      });
  }, [teamId, form.connectedAccountId, connections, form.adAccountId]);

  const platformLabel = useMemo(() => {
    const map = Object.fromEntries(AD_PLATFORMS.map((p) => [p.id, p.label]));
    return (id: string) => map[id] || id;
  }, []);

  async function connectAds(platform: string) {
    if (!teamId) return;
    setMessage("");
    const res = await fetch("/api/ads/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, platform }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(toClientFacingMessage(data.error || "Could not start ads connect"));
      return;
    }
    if (data.alreadyConnected && data.redirectUrl) {
      window.location.href = data.redirectUrl;
      return;
    }
    if (!data.authUrl) {
      setMessage("Could not start OAuth — try again");
      return;
    }
    window.location.href = data.authUrl;
  }

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const presign = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "image/jpeg" }),
      });
      const urls = await presign.json();
      if (!presign.ok) throw new Error(urls.error || "Upload failed");
      const put = await fetch(urls.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!put.ok) throw new Error("Storage upload failed");
      setForm((f) => ({ ...f, imageUrl: urls.publicUrl }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function generateAdWithAi() {
    if (!teamId || !aiReady) return;
    const estimatedTokens = 800;
    const confirmed = window.confirm(
      `Generate ad copy uses approximately ${estimatedTokens.toLocaleString()} tokens.\n\nYour balance: ${tokenBalance.toLocaleString()} tokens.\n\nContinue?`,
    );
    if (!confirmed) return;
    setGeneratingAd(true);
    setMessage("");
    const conn = connections.find((c) => c.id === form.connectedAccountId);
    const prompt = aiPrompt.trim() || form.body.trim() || form.name.trim();
    const res = await fetch("/api/ai/generate?action=ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        prompt,
        goal: form.goal,
        platform: conn ? platformLabel(conn.platform) : "paid social",
        tone: "promotional",
      }),
    });
    const data = await res.json();
    setGeneratingAd(false);
    if (!res.ok) {
      setMessage(data.error || "Could not generate ad copy");
      return;
    }
    setForm((f) => ({
      ...f,
      body: data.primaryText || f.body,
      headline: data.headline || f.headline,
    }));
    if (data.tokenBalance !== undefined) setTokenBalance(data.tokenBalance);
    setMessage("Ad copy generated — review and edit before publishing.");
  }

  async function createAd() {
    if (!teamId) return;
    setCreating(true);
    setMessage("");
    const res = await fetch("/api/ads/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        connectedAccountId: form.connectedAccountId,
        adAccountId: form.adAccountId,
        name: form.name,
        goal: form.goal,
        body: form.body,
        headline: form.headline,
        linkUrl: form.linkUrl,
        imageUrl: form.imageUrl,
        budgetAmount: Number(form.budgetAmount),
        budgetType: form.budgetType,
        countries: form.countries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setMessage(data.error || "Could not create ad");
      return;
    }
    setShowCreate(false);
    setMessage(data.message || "Ad created — pending platform review");
    await load();
  }

  const canCreate =
    adsEnabled &&
    form.connectedAccountId &&
    form.adAccountId &&
    form.body.trim() &&
    form.headline.trim() &&
    form.linkUrl.trim() &&
    form.imageUrl.trim();

  if (!adsLoaded) {
    return <p className="text-sm text-muted-foreground">Loading ads...</p>;
  }

  if (!adsEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Megaphone className="h-8 w-8 text-primary" />
            Ads
          </h1>
          <p className="text-muted-foreground">Paid advertising is not available on this platform right now.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Feature disabled</CardTitle>
            <CardDescription>
              The platform owner has turned off paid ads. You can still schedule organic posts, manage inbox,
              and use AI from the rest of your workspace.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Megaphone className="h-8 w-8 text-primary" />
            Ads
          </h1>
          <p className="text-muted-foreground">
            Connect your own ad accounts and publish campaigns — ad spend is billed directly by Meta,
            Google, TikTok, and other platforms.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={() => setShowCreate(true)} disabled={connections.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Create ad
          </Button>
        </div>
      </div>

      {message ? (
        <p className="text-sm text-muted-foreground">
          {message}
          {message.toLowerCase().includes("upgrade") ? (
            <>
              {" "}
              <Link href="/dashboard/billing" className="text-primary underline">
                View plans
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Ad account connections</CardTitle>
          <CardDescription>
            Clients connect their own ad platforms here (OAuth). Each connection links to the ad accounts
            they manage on Meta, Google, TikTok, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.length > 0 ? (
            <div className="space-y-2">
              {connections.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded border p-3 text-sm">
                  <div>
                    <p className="font-medium">{platformLabel(c.platform)}</p>
                    <p className="text-muted-foreground">{c.displayName || c.username || c.zernioAccountId}</p>
                  </div>
                  <Badge variant="outline">Connected</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No ads accounts connected yet. Connect a platform below to create campaigns.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AD_PLATFORMS.map((p) => (
              <Button key={p.id} variant="outline" className="h-auto flex-col items-start p-3" onClick={() => connectAds(p.id)}>
                <span className="font-medium">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>Live campaigns from connected ad accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {campaigns.length === 0 && localCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
          ) : (
            <>
              {campaigns.map((c) => (
                <div key={String(c.platformCampaignId)} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{c.campaignName || "Campaign"}</p>
                    <Badge>{c.status || "unknown"}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {platformLabel(String(c.platform || ""))} · ${c.budget?.amount || 0}/{c.budget?.type || "day"}
                  </p>
                  {c.metrics ? (
                    <p className="text-xs text-muted-foreground">
                      Spend ${c.metrics.spend?.toFixed(2) || 0} · {c.metrics.impressions || 0} impressions ·{" "}
                      {c.metrics.clicks || 0} clicks
                    </p>
                  ) : null}
                </div>
              ))}
              {localCampaigns.map((c) => (
                <div key={c.id} className="rounded border border-dashed p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{c.name}</p>
                    <Badge variant="secondary">{c.status}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {platformLabel(c.platform)} · {c.goal} · ${c.budgetAmount}/{c.budgetType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${c.budgetAmount}/{c.budgetType} · {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Create ad</CardTitle>
                <CardDescription>Design your ad creative and configure targeting</CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  {aiReady ? (
                    <div className="rounded-lg border border-dashed bg-muted/30 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI ad assistant
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Balance: {tokenBalance.toLocaleString()} tokens · generates primary text + headline
                      </p>
                      <Textarea
                        rows={2}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Optional — leave blank to use campaign name or business profile"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={generatingAd}
                        onClick={generateAdWithAi}
                      >
                        {generatingAd ? "Generating..." : "Generate ad copy"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Uses your business profile from{" "}
                        <Link href="/dashboard/settings" className="text-primary underline">
                          Settings
                        </Link>
                        .
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Enable AI in{" "}
                      <Link href="/dashboard/settings" className="text-primary underline">
                        Settings
                      </Link>{" "}
                      and add tokens in Billing to generate ad copy with AI.
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label>Primary text</Label>
                    <Textarea
                      rows={4}
                      maxLength={125}
                      placeholder="Write the main text for your ad..."
                      value={form.body}
                      onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">{form.body.length}/125</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Media</Label>
                    <div className="rounded-lg border border-dashed p-6 text-center">
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void onUpload(file);
                        }}
                      />
                      <p className="mt-2 text-xs text-muted-foreground">JPG or PNG, recommended 1200×628px</p>
                      {form.imageUrl ? (
                        <p className="mt-2 truncate text-xs text-primary">Image uploaded</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Headline</Label>
                    <Input
                      maxLength={40}
                      placeholder="Your headline"
                      value={form.headline}
                      onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">{form.headline.length}/40</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Destination URL</Label>
                    <Input
                      type="url"
                      placeholder="https://yourwebsite.com/landing-page"
                      value={form.linkUrl}
                      onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ad name</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Platform &amp; account</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.connectedAccountId}
                      onChange={(e) => setForm((f) => ({ ...f, connectedAccountId: e.target.value, adAccountId: "" }))}
                    >
                      <option value="">Select ads connection...</option>
                      {connections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {platformLabel(c.platform)} — {c.displayName || c.username || "Account"}
                        </option>
                      ))}
                    </select>
                    {form.connectedAccountId ? (
                      <select
                        className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={form.adAccountId}
                        onChange={(e) => setForm((f) => ({ ...f, adAccountId: e.target.value }))}
                      >
                        <option value="">Select ad account...</option>
                        {adAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.currency})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        <Link href="#connect" className="text-primary underline" onClick={() => setShowCreate(false)}>
                          Connect an ads platform
                        </Link>{" "}
                        first.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Goal</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AD_GOALS.map((g) => (
                        <Button
                          key={g.id}
                          type="button"
                          size="sm"
                          variant={form.goal === g.id ? "default" : "outline"}
                          onClick={() => setForm((f) => ({ ...f, goal: g.id }))}
                        >
                          {g.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Budget</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input
                          className="pl-7"
                          type="number"
                          min={1}
                          value={form.budgetAmount}
                          onChange={(e) => setForm((f) => ({ ...f, budgetAmount: e.target.value }))}
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={form.budgetType === "daily" ? "default" : "outline"}
                        onClick={() => setForm((f) => ({ ...f, budgetType: "daily" }))}
                      >
                        Per day
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={form.budgetType === "lifetime" ? "default" : "outline"}
                        onClick={() => setForm((f) => ({ ...f, budgetType: "lifetime" }))}
                      >
                        Total
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Budget is charged to your connected ad account — no fee from this platform.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Targeting (countries)</Label>
                    <Input
                      placeholder="US, PH, GB"
                      value={form.countries}
                      onChange={(e) => setForm((f) => ({ ...f, countries: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">ISO country codes, comma-separated</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button disabled={!canCreate || creating} onClick={createAd}>
                  {creating ? "Publishing..." : "Publish ad"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

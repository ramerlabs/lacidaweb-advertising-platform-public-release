"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublisherAdServingMode } from "@/lib/ads-settings";

type AdsSettings = {
  adsEnabled: boolean;
  adsProfitMarginPercent: number;
  publisherAdServingMode: PublisherAdServingMode;
  publisherAdRotateSeconds: number;
  publisherAutoAdsEnabled: boolean;
  requireDomainApproval: boolean;
  allowedAdDomains: string;
  publisherCpmCents: number;
  publisherCpcCents: number;
  publisherMinPayoutCents: number;
  landingFakeStatsEnabled: boolean;
  landingFakeImpressionsBase: number;
  landingFakeClicksBase: number;
  landingFakeImpressionsPerHour: number;
  landingFakeClicksPerHour: number;
  houseAdHeadline: string;
  houseAdBody: string;
  houseAdCtaLabel: string;
  houseAdUrl: string;
};

function mapSettings(data: Partial<AdsSettings> & Record<string, unknown>): AdsSettings {
  return {
    adsEnabled: Boolean(data.adsEnabled ?? true),
    adsProfitMarginPercent: Number(data.adsProfitMarginPercent ?? 55),
    publisherAdServingMode:
      data.publisherAdServingMode === "PERSONALIZED" ? "PERSONALIZED" : "ROTATE_ALL",
    publisherAdRotateSeconds: Number(data.publisherAdRotateSeconds ?? 8),
    publisherAutoAdsEnabled: Boolean(data.publisherAutoAdsEnabled ?? true),
    requireDomainApproval: Boolean(data.requireDomainApproval ?? false),
    allowedAdDomains: String(data.allowedAdDomains || ""),
    publisherCpmCents: Number(data.publisherCpmCents ?? 100),
    publisherCpcCents: Number(data.publisherCpcCents ?? 10),
    publisherMinPayoutCents: Number(data.publisherMinPayoutCents ?? 2500),
    landingFakeStatsEnabled: Boolean(data.landingFakeStatsEnabled ?? true),
    landingFakeImpressionsBase: Number(data.landingFakeImpressionsBase ?? 18420),
    landingFakeClicksBase: Number(data.landingFakeClicksBase ?? 612),
    landingFakeImpressionsPerHour: Number(data.landingFakeImpressionsPerHour ?? 180),
    landingFakeClicksPerHour: Number(data.landingFakeClicksPerHour ?? 7.2),
    houseAdHeadline: String(data.houseAdHeadline || ""),
    houseAdBody: String(data.houseAdBody || ""),
    houseAdCtaLabel: String(data.houseAdCtaLabel || "Visit lacidaweb.com"),
    houseAdUrl: String(data.houseAdUrl || ""),
  };
}

export default function AdminAdsSettingsPage() {
  const [settings, setSettings] = useState<AdsSettings | null>(null);
  const [personalEmbedSnippet, setPersonalEmbedSnippet] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/ads")
      .then((r) => r.json())
      .then((data) => {
        setLoading(false);
        if (data.settings) {
          setSettings(mapSettings(data.settings));
          setPersonalEmbedSnippet(data.personalEmbedSnippet || "");
        }
      });
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/admin/settings/ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error || "Save failed");
      return;
    }
    setSettings(mapSettings(data.settings));
    setPersonalEmbedSnippet(data.personalEmbedSnippet || "");
    setStatus("Publisher ad settings saved.");
  }

  async function copyPersonalSnippet() {
    if (!personalEmbedSnippet) return;
    await navigator.clipboard.writeText(personalEmbedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || !settings) {
    return <p className="text-sm text-muted-foreground">Loading ads settings...</p>;
  }

  const rotateAll = settings.publisherAdServingMode === "ROTATE_ALL";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Publisher ads</h1>
        <p className="text-muted-foreground">
          Control how lacidaweb fills publisher embed slots — rotate all active campaigns now, or
          switch to cookie-based recommendations later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Network toggle</CardTitle>
          <CardDescription>
            When disabled, embed slots return empty and advertiser campaign tools are hidden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.adsEnabled}
              onChange={(e) => setSettings({ ...settings, adsEnabled: e.target.checked })}
            />
            Enable lacidaweb ad network (publisher embeds + advertiser campaigns)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domain approval</CardTitle>
          <CardDescription>
            For personal sites: add domains below and use the personal embed snippet. Those hosts
            can show ads without registering a publisher site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.requireDomainApproval}
              onChange={(e) =>
                setSettings({ ...settings, requireDomainApproval: e.target.checked })
              }
            />
            <span>
              <span className="font-medium">Require domain approval</span>
              <span className="mt-1 block text-muted-foreground">
                When on, publisher embeds only serve if the page host matches the registered site
                domain, or is on the allowlist below. When off, any valid embed key works on any
                domain (current loose mode).
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <Label htmlFor="allowed-domains">Allowed domains</Label>
            <textarea
              id="allowed-domains"
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={"myblog.com\nshop.example.com"}
              value={settings.allowedAdDomains}
              onChange={(e) => setSettings({ ...settings, allowedAdDomains: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              One domain per line (or comma-separated). www is ignored. Use these with the personal
              embed snippet on sites that are not in the publisher database.
            </p>
          </div>

          {personalEmbedSnippet ? (
            <div className="space-y-2">
              <Label>Personal embed snippet</Label>
              <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
                {personalEmbedSnippet}
              </pre>
              <Button type="button" variant="outline" size="sm" onClick={copyPersonalSnippet}>
                {copied ? "Copied" : "Copy snippet"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Paste on allowlisted domains only. Traffic is tracked on the platform personal site
                (not paid out as a publisher).
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ad serving mode</CardTitle>
          <CardDescription>
            With a small inventory, rotate all ads so every campaign gets impressions immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 rounded-lg border p-3">
            <input
              type="radio"
              name="servingMode"
              className="mt-1"
              checked={rotateAll}
              onChange={() => setSettings({ ...settings, publisherAdServingMode: "ROTATE_ALL" })}
            />
            <span>
              <span className="font-medium">Rotate all ads (recommended now)</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Every approved campaign is eligible. Each page view advances the rotation fairly
                across your inventory. Multiple ads can cycle in the same slot on one page.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border p-3">
            <input
              type="radio"
              name="servingMode"
              className="mt-1"
              checked={!rotateAll}
              onChange={() => setSettings({ ...settings, publisherAdServingMode: "PERSONALIZED" })}
            />
            <span>
              <span className="font-medium">Personalized recommendations (cookie)</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Uses a visitor cookie to prefer relevant ads. Early version — still serves from your
                active inventory. Full targeting rules can be added later.
              </span>
            </span>
          </label>

          {rotateAll ? (
            <div className="space-y-2">
              <Label htmlFor="rotate-seconds">Rotate every (seconds)</Label>
              <Input
                id="rotate-seconds"
                type="number"
                min={0}
                max={120}
                value={settings.publisherAdRotateSeconds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    publisherAdRotateSeconds: Math.min(120, Math.max(0, Number(e.target.value) || 0)),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Set to 0 to only rotate on each new page load. Default 8 seconds cycles through all
                ads in one embed slot.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publisher payout rates</CardTitle>
          <CardDescription>
            Set publisher payout rates and your platform profit margin. Default is 55% platform /
            45% publisher — change the percent anytime below. Fraud filters discard bots and
            duplicates before spend or earnings are applied.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="cpm">Publisher CPM (USD / 1,000)</Label>
            <Input
              id="cpm"
              type="number"
              min={0}
              step="0.01"
              value={(settings.publisherCpmCents / 100).toFixed(2)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  publisherCpmCents: Math.round(Math.max(0, Number(e.target.value) || 0) * 100),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpc">Publisher CPC (USD / click)</Label>
            <Input
              id="cpc"
              type="number"
              min={0}
              step="0.01"
              value={(settings.publisherCpcCents / 100).toFixed(2)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  publisherCpcCents: Math.round(Math.max(0, Number(e.target.value) || 0) * 100),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="margin">Platform profit margin % (editable anytime)</Label>
            <Input
              id="margin"
              type="number"
              min={0}
              max={99}
              step="1"
              value={settings.adsProfitMarginPercent}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  adsProfitMarginPercent: Math.min(
                    99,
                    Math.max(0, Math.floor(Number(e.target.value) || 0)),
                  ),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              You keep {settings.adsProfitMarginPercent}%, publishers get{" "}
              {100 - settings.adsProfitMarginPercent}% of advertiser spend. Advertiser rates: CPC $
              {(
                settings.publisherCpcCents /
                  100 /
                  (1 - Math.min(99, Math.max(0, settings.adsProfitMarginPercent)) / 100 || 1) || 0
              ).toFixed(2)}
              , CPM $
              {(
                settings.publisherCpmCents /
                  100 /
                  (1 - Math.min(99, Math.max(0, settings.adsProfitMarginPercent)) / 100 || 1) || 0
              ).toFixed(2)}{" "}
              (publisher ÷ (1 − margin)).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-payout">Minimum payout (USD)</Label>
            <Input
              id="min-payout"
              type="number"
              min={1}
              step="0.01"
              value={(settings.publisherMinPayoutCents / 100).toFixed(2)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  publisherMinPayoutCents: Math.round(
                    Math.max(1, Number(e.target.value) || 1) * 100,
                  ),
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Landing page social proof</CardTitle>
          <CardDescription>
            Homepage shows network Impressions and Clicks from ads served on publisher sites (valid
            AdEvents across all campaigns) — not visits to this landing page. Optional fake growth
            can pad the counters before you have real traffic; turn it off anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.landingFakeStatsEnabled}
              onChange={(e) =>
                setSettings({ ...settings, landingFakeStatsEnabled: e.target.checked })
              }
            />
            Enable fake growth on top of real network ad events
          </label>
          {settings.landingFakeStatsEnabled ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fake-imp-base">Impressions baseline</Label>
                <Input
                  id="fake-imp-base"
                  type="number"
                  min={0}
                  value={settings.landingFakeImpressionsBase}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      landingFakeImpressionsBase: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fake-click-base">Clicks baseline</Label>
                <Input
                  id="fake-click-base"
                  type="number"
                  min={0}
                  value={settings.landingFakeClicksBase}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      landingFakeClicksBase: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fake-imp-rate">Impressions gained / hour</Label>
                <Input
                  id="fake-imp-rate"
                  type="number"
                  min={0}
                  step="1"
                  value={settings.landingFakeImpressionsPerHour}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      landingFakeImpressionsPerHour: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fake-click-rate">Clicks gained / hour</Label>
                <Input
                  id="fake-click-rate"
                  type="number"
                  min={0}
                  step="0.1"
                  value={settings.landingFakeClicksPerHour}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      landingFakeClicksPerHour: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Fake data is off — homepage shows only real valid impressions and clicks from ads
              served across all campaigns on publisher sites.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>House / fill promo</CardTitle>
          <CardDescription>
            When a page has fewer paid ads than auto slots (max 4), leftover slots show this
            &quot;Advertise with us&quot; promo. Leave fields blank to use the default brand copy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="house-headline">Headline</Label>
            <Input
              id="house-headline"
              value={settings.houseAdHeadline}
              onChange={(e) => setSettings({ ...settings, houseAdHeadline: e.target.value })}
              placeholder="Advertise with lacidaweb"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="house-body">Body text</Label>
            <Input
              id="house-body"
              value={settings.houseAdBody}
              onChange={(e) => setSettings({ ...settings, houseAdBody: e.target.value })}
              placeholder="Reach customers across the network. Visit lacidaweb.com"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="house-cta">CTA label</Label>
              <Input
                id="house-cta"
                value={settings.houseAdCtaLabel}
                onChange={(e) => setSettings({ ...settings, houseAdCtaLabel: e.target.value })}
                placeholder="Visit lacidaweb.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="house-url">Destination URL</Label>
              <Input
                id="house-url"
                value={settings.houseAdUrl}
                onChange={(e) => setSettings({ ...settings, houseAdUrl: e.target.value })}
                placeholder="https://lacidaweb.com/register/advertiser"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automatic placement</CardTitle>
          <CardDescription>
            Google-style Auto ads — one script per site; lacidaweb inserts slots into page content
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.publisherAutoAdsEnabled}
              onChange={(e) =>
                setSettings({ ...settings, publisherAutoAdsEnabled: e.target.checked })
              }
            />
            Allow publishers to use automatic ad placement
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            When off, only manual embed codes work. Publishers can still toggle auto ads per site.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublisherAdServingMode } from "@/lib/ads-settings";

type AdsSettings = {
  adsEnabled: boolean;
  publisherAdServingMode: PublisherAdServingMode;
  publisherAdRotateSeconds: number;
  publisherAutoAdsEnabled: boolean;
  publisherCpmCents: number;
  publisherCpcCents: number;
  publisherMinPayoutCents: number;
};

export default function AdminAdsSettingsPage() {
  const [settings, setSettings] = useState<AdsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/ads")
      .then((r) => r.json())
      .then((data) => {
        setLoading(false);
        if (data.settings) {
          setSettings({
            adsEnabled: data.settings.adsEnabled,
            publisherAdServingMode: data.settings.publisherAdServingMode || "ROTATE_ALL",
            publisherAdRotateSeconds: data.settings.publisherAdRotateSeconds ?? 8,
            publisherAutoAdsEnabled: data.settings.publisherAutoAdsEnabled ?? true,
            publisherCpmCents: data.settings.publisherCpmCents ?? 100,
            publisherCpcCents: data.settings.publisherCpcCents ?? 10,
            publisherMinPayoutCents: data.settings.publisherMinPayoutCents ?? 2500,
          });
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
    setSettings({
      adsEnabled: data.settings.adsEnabled,
      publisherAdServingMode: data.settings.publisherAdServingMode,
      publisherAdRotateSeconds: data.settings.publisherAdRotateSeconds,
      publisherAutoAdsEnabled: data.settings.publisherAutoAdsEnabled,
      publisherCpmCents: data.settings.publisherCpmCents,
      publisherCpcCents: data.settings.publisherCpcCents,
      publisherMinPayoutCents: data.settings.publisherMinPayoutCents,
    });
    setStatus("Publisher ad settings saved.");
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
            Pay publishers by impression (CPM) and by click (CPC). Fraud filters discard bots and
            duplicate events before earnings are credited.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="cpm">CPM (USD per 1,000 views)</Label>
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
            <Label htmlFor="cpc">CPC (USD per click)</Label>
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

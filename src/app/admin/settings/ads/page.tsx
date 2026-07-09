"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AdsSettings = {
  adsEnabled: boolean;
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
        if (data.settings) setSettings({ adsEnabled: data.settings.adsEnabled });
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
    setSettings({ adsEnabled: data.settings.adsEnabled });
    setStatus("Ads settings saved.");
  }

  if (loading || !settings) {
    return <p className="text-sm text-muted-foreground">Loading ads settings...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ads</h1>
        <p className="text-muted-foreground">
          Clients connect their own Meta, Google, TikTok, and other ad accounts. Ad spend is billed
          directly by the ad platform — this site does not charge a fee or collect payment for ads.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature toggle</CardTitle>
          <CardDescription>
            When enabled, clients can connect ad accounts and publish campaigns from the dashboard. When
            disabled, ads are hidden from the landing page and client navigation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.adsEnabled}
              onChange={(e) => setSettings({ adsEnabled: e.target.checked })}
            />
            Enable paid advertising for clients
          </label>
          <p className="text-xs text-muted-foreground">
            No platform fee is applied. Budgets are sent to the client&apos;s connected ad account via Zernio.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save ads settings"}
        </Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </div>
    </div>
  );
}

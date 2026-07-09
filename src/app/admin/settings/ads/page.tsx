"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { clientChargeFromPlatformBudget } from "@/lib/ads-pricing";

type AdsSettings = {
  adsEnabled: boolean;
  adsProfitMarginPercent: number;
  adWalletTopUpUsd: number;
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
        if (data.settings) setSettings(data.settings);
      });
  }, []);

  const preview = useMemo(() => {
    const margin = settings?.adsProfitMarginPercent ?? 30;
    const budgets = [5, 10, 25, 50];
    return budgets.map((budget) => ({
      budget,
      charge: clientChargeFromPlatformBudget(budget, margin),
    }));
  }, [settings?.adsProfitMarginPercent]);

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
    setSettings(data.settings);
    setStatus("Ads settings saved.");
  }

  function update<K extends keyof AdsSettings>(key: K, value: AdsSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  if (loading || !settings) {
    return <p className="text-sm text-muted-foreground">Loading ads settings...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ads</h1>
        <p className="text-muted-foreground">
          Control whether clients can run paid campaigns and set your platform fee on ad spend. Separate
          from AI token margin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature toggle</CardTitle>
          <CardDescription>
            When disabled, the Ads section is hidden from the landing page, client dashboard, and billing
            wallet top-up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.adsEnabled}
              onChange={(e) => update("adsEnabled", e.target.checked)}
            />
            Enable paid advertising for clients
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform fee</CardTitle>
          <CardDescription>
            Your margin on ad spend. Client charge = ad budget ÷ (1 − fee%). Default is 30%. Clients see
            &quot;includes platform fee&quot; — not the percentage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Profit margin (%)</Label>
            <Input
              type="number"
              min={0}
              max={99}
              value={settings.adsProfitMarginPercent}
              onChange={(e) =>
                update("adsProfitMarginPercent", Math.min(99, Math.max(0, Number(e.target.value) || 0)))
              }
              className="w-32"
            />
          </div>
          <div className="space-y-2">
            <Label>Default wallet top-up (USD)</Label>
            <Input
              type="number"
              min={5}
              step={1}
              value={settings.adWalletTopUpUsd}
              onChange={(e) => update("adWalletTopUpUsd", Math.max(5, Number(e.target.value) || 5))}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">Suggested amount on Billing → Ad wallet.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client pricing preview</CardTitle>
          <CardDescription>What clients pay for a given ad budget at the current margin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Ad budget</th>
                  <th className="pb-2 font-medium">Client pays</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.budget} className="border-b last:border-0">
                    <td className="py-2 pr-4">${row.budget.toFixed(2)}</td>
                    <td className="py-2 font-medium">${row.charge.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

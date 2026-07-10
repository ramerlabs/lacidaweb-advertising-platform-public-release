"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/pricing";

type Settings = {
  subscriptionProfitMarginPercent: number;
};

export default function AdminPlansSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/plans")
      .then((r) => r.json())
      .then((data) => {
        setLoading(false);
        if (data.settings) setSettings(data.settings);
        if (data.plans) setPlans(data.plans);
      });
  }, []);

  const preview = useMemo(() => plans, [plans]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/admin/settings/plans", {
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
    setPlans(data.plans || []);
    setStatus("Plan pricing saved.");
  }

  if (loading || !settings) {
    return <p className="text-sm text-muted-foreground">Loading plan settings...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plans &amp; accounts</h1>
        <p className="text-muted-foreground">
          Set your profit margin on subscription plans. Prices are calculated from estimated per-account
          platform cost (first 2 accounts free). Clients upgrade to connect more channels.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account connection pricing</CardTitle>
          <CardDescription>
            Client plan price = platform cost ÷ (1 − margin%). Default is 80%. This controls what you charge
            for Starter, Growth, and Scale — not ads or AI tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Profit margin (%)</Label>
            <Input
              type="number"
              min={0}
              max={99}
              value={settings.subscriptionProfitMarginPercent}
              onChange={(e) =>
                setSettings({
                  subscriptionProfitMarginPercent: Math.min(
                    99,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                })
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              At 80% margin, a $6 platform account cost becomes a $30 client plan component.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan price preview</CardTitle>
          <CardDescription>Live subscription prices shown on the landing page and Billing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Plan</th>
                  <th className="pb-2 pr-4 font-medium">Accounts</th>
                  <th className="pb-2 pr-4 font-medium">Platform cost/mo</th>
                  <th className="pb-2 pr-4 font-medium">Client monthly</th>
                  <th className="pb-2 font-medium">Est. margin</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((plan) => (
                  <tr key={plan.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{plan.name}</td>
                    <td className="py-2 pr-4">{plan.accountLimit}</td>
                    <td className="py-2 pr-4">${plan.platformCostMonthly}</td>
                    <td className="py-2 pr-4">${plan.monthlyPrice}/mo</td>
                    <td className="py-2">{plan.estimatedMarginPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save plan pricing"}
        </Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </div>
    </div>
  );
}

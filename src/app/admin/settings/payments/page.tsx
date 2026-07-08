"use client";

import { useEffect, useState } from "react";
import { RECOMMENDED_USDT_INSTRUCTIONS } from "@/lib/payment-instructions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type PaymentSettings = {
  usdtEnabled: boolean;
  paypalEnabled: boolean;
  gcashEnabled: boolean;
  usdtTrc20Wallet: string;
  usdtInstructions: string;
  paypalInstructions: string;
  gcashInstructions: string;
  usdtPerUsd: number | null;
};

function MethodToggle({
  id,
  label,
  enabled,
  onChange,
}: {
  id: string;
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input"
      />
      <span className={enabled ? "font-medium text-foreground" : "text-muted-foreground"}>
        {enabled ? `${label} enabled` : `${label} disabled`}
      </span>
    </label>
  );
}

export default function AdminPaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings>({
    usdtEnabled: true,
    paypalEnabled: true,
    gcashEnabled: true,
    usdtTrc20Wallet: "",
    usdtInstructions: "",
    paypalInstructions: "",
    gcashInstructions: "",
    usdtPerUsd: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/settings/payments");
      const data = await res.json();
      setLoading(false);
      if (res.ok) setSettings(data.settings);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/admin/settings/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        usdtPerUsd: settings.usdtPerUsd && settings.usdtPerUsd > 0 ? settings.usdtPerUsd : null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error || "Save failed");
      return;
    }
    setSettings(data.settings);
    setStatus("Payment details saved. Clients will see these on checkout.");
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading payment settings...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment details</h1>
        <p className="text-muted-foreground">
          Enable or disable payment options and configure how clients pay you.
        </p>
      </div>

      <Card className={!settings.usdtEnabled ? "opacity-80" : ""}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>USDT (TRC20)</CardTitle>
            <CardDescription>Automatic blockchain payment verification</CardDescription>
          </div>
          <MethodToggle
            id="usdt-enabled"
            label="USDT"
            enabled={settings.usdtEnabled}
            onChange={(usdtEnabled) => setSettings((s) => ({ ...s, usdtEnabled }))}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="usdt-wallet">TRC20 wallet address</Label>
            <Input
              id="usdt-wallet"
              placeholder="T..."
              disabled={!settings.usdtEnabled}
              value={settings.usdtTrc20Wallet}
              onChange={(e) => setSettings((s) => ({ ...s, usdtTrc20Wallet: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="usdt-rate">USD per 1 USDT (optional)</Label>
            <Input
              id="usdt-rate"
              type="number"
              step="0.0001"
              disabled={!settings.usdtEnabled}
              placeholder="Leave empty to use live CoinGecko rate"
              value={settings.usdtPerUsd ?? ""}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  usdtPerUsd: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="usdt-instructions">Client instructions</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!settings.usdtEnabled}
                onClick={() =>
                  setSettings((s) => ({ ...s, usdtInstructions: RECOMMENDED_USDT_INSTRUCTIONS }))
                }
              >
                Use recommended text
              </Button>
            </div>
            <Textarea
              id="usdt-instructions"
              rows={8}
              disabled={!settings.usdtEnabled}
              value={settings.usdtInstructions}
              onChange={(e) => setSettings((s) => ({ ...s, usdtInstructions: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Shown to clients at checkout. The exact USDT amount and wallet address are added automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={!settings.paypalEnabled ? "opacity-80" : ""}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>PayPal</CardTitle>
            <CardDescription>Manual approval after client pays</CardDescription>
          </div>
          <MethodToggle
            id="paypal-enabled"
            label="PayPal"
            enabled={settings.paypalEnabled}
            onChange={(paypalEnabled) => setSettings((s) => ({ ...s, paypalEnabled }))}
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="paypal-instructions">PayPal instructions</Label>
            <Textarea
              id="paypal-instructions"
              rows={3}
              disabled={!settings.paypalEnabled}
              placeholder="e.g. Send payment to your-paypal@email.com and include your account email in the note."
              value={settings.paypalInstructions}
              onChange={(e) => setSettings((s) => ({ ...s, paypalInstructions: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={!settings.gcashEnabled ? "opacity-80" : ""}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>GCash</CardTitle>
            <CardDescription>Manual approval after client pays</CardDescription>
          </div>
          <MethodToggle
            id="gcash-enabled"
            label="GCash"
            enabled={settings.gcashEnabled}
            onChange={(gcashEnabled) => setSettings((s) => ({ ...s, gcashEnabled }))}
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="gcash-instructions">GCash instructions</Label>
            <Textarea
              id="gcash-instructions"
              rows={3}
              disabled={!settings.gcashEnabled}
              placeholder="e.g. Send to GCash 09XX XXX XXXX. Upload screenshot proof in support if needed."
              value={settings.gcashInstructions}
              onChange={(e) => setSettings((s) => ({ ...s, gcashInstructions: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save payment details"}
        </Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </div>
    </div>
  );
}

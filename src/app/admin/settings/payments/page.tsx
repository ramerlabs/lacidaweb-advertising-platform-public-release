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
  usBankEnabled: boolean;
  usdtTrc20Wallet: string;
  paypalEmail: string;
  gcashNumber: string;
  usBankName: string;
  usBankAccountName: string;
  usBankAccountNumber: string;
  usBankRoutingNumber: string;
  usBankAccountType: string;
  usdtInstructions: string;
  paypalInstructions: string;
  gcashInstructions: string;
  usBankInstructions: string;
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
    usBankEnabled: false,
    usdtTrc20Wallet: "",
    paypalEmail: "",
    gcashNumber: "",
    usBankName: "",
    usBankAccountName: "",
    usBankAccountNumber: "",
    usBankRoutingNumber: "",
    usBankAccountType: "Checking",
    usdtInstructions: "",
    paypalInstructions: "",
    gcashInstructions: "",
    usBankInstructions: "",
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paypal-email">PayPal email</Label>
              <Input
                id="paypal-email"
                type="email"
                disabled={!settings.paypalEnabled}
                placeholder="your-paypal@email.com"
                value={settings.paypalEmail}
                onChange={(e) => setSettings((s) => ({ ...s, paypalEmail: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Shown to clients at checkout: &quot;Send $X to PayPal: your email&quot;
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paypal-instructions">Extra PayPal notes (optional)</Label>
              <Textarea
                id="paypal-instructions"
                rows={3}
                disabled={!settings.paypalEnabled}
                placeholder="e.g. Include your account email in the PayPal note."
                value={settings.paypalInstructions}
                onChange={(e) => setSettings((s) => ({ ...s, paypalInstructions: e.target.value }))}
              />
            </div>
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gcash-number">GCash mobile number</Label>
              <Input
                id="gcash-number"
                disabled={!settings.gcashEnabled}
                placeholder="09XX XXX XXXX"
                value={settings.gcashNumber}
                onChange={(e) => setSettings((s) => ({ ...s, gcashNumber: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Shown to clients at checkout: &quot;Send to GCash: your number&quot;
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gcash-instructions">Extra GCash notes (optional)</Label>
              <Textarea
                id="gcash-instructions"
                rows={3}
                disabled={!settings.gcashEnabled}
                placeholder="e.g. Screenshot your receipt and contact support if needed."
                value={settings.gcashInstructions}
                onChange={(e) => setSettings((s) => ({ ...s, gcashInstructions: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={!settings.usBankEnabled ? "opacity-80" : ""}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>US bank transfer</CardTitle>
            <CardDescription>Wire or ACH — client enters a transfer reference after paying</CardDescription>
          </div>
          <MethodToggle
            id="usbank-enabled"
            label="US Bank"
            enabled={settings.usBankEnabled}
            onChange={(usBankEnabled) => setSettings((s) => ({ ...s, usBankEnabled }))}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="usbank-name">Bank name</Label>
              <Input
                id="usbank-name"
                disabled={!settings.usBankEnabled}
                placeholder="Chase, Bank of America..."
                value={settings.usBankName}
                onChange={(e) => setSettings((s) => ({ ...s, usBankName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usbank-account-name">Account holder name</Label>
              <Input
                id="usbank-account-name"
                disabled={!settings.usBankEnabled}
                placeholder="Business or personal name on account"
                value={settings.usBankAccountName}
                onChange={(e) => setSettings((s) => ({ ...s, usBankAccountName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usbank-routing">Routing number</Label>
              <Input
                id="usbank-routing"
                disabled={!settings.usBankEnabled}
                placeholder="9-digit routing number"
                value={settings.usBankRoutingNumber}
                onChange={(e) => setSettings((s) => ({ ...s, usBankRoutingNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usbank-account">Account number</Label>
              <Input
                id="usbank-account"
                disabled={!settings.usBankEnabled}
                placeholder="Account number"
                value={settings.usBankAccountNumber}
                onChange={(e) => setSettings((s) => ({ ...s, usBankAccountNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usbank-type">Account type</Label>
              <Input
                id="usbank-type"
                disabled={!settings.usBankEnabled}
                placeholder="Checking or Savings"
                value={settings.usBankAccountType}
                onChange={(e) => setSettings((s) => ({ ...s, usBankAccountType: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="usbank-instructions">Client instructions</Label>
            <Textarea
              id="usbank-instructions"
              rows={3}
              disabled={!settings.usBankEnabled}
              placeholder="e.g. Include your workspace email in the transfer memo."
              value={settings.usBankInstructions}
              onChange={(e) => setSettings((s) => ({ ...s, usBankInstructions: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Bank details are shown on Billing after the client starts a payment. They submit a reference number for manual approval.
            </p>
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

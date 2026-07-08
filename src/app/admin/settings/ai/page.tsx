"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { AiClientPricing } from "@/lib/ai-pricing";
import { getClientPricing } from "@/lib/ai-pricing";

type AiSettings = {
  aiEnabled: boolean;
  hasOpenaiApiKey: boolean;
  openaiApiKeyMasked: string;
  aiProfitMarginPercent: number;
  aiTextInputCostPerMillion: number;
  aiTextOutputCostPerMillion: number;
  aiImageCostUsd: number;
  aiCreditPackUsd: number;
  aiCreditsPerPackCents: number;
  clientPricing: AiClientPricing;
};

export default function AdminAiSettingsPage() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/ai")
      .then((r) => r.json())
      .then((data) => {
        setLoading(false);
        if (data.settings) setSettings(data.settings);
      });
  }, []);

  const preview = useMemo(
    () =>
      getClientPricing({
        profitMarginPercent: settings?.aiProfitMarginPercent ?? 80,
        textInputCostPerMillion: settings?.aiTextInputCostPerMillion ?? 0.15,
        textOutputCostPerMillion: settings?.aiTextOutputCostPerMillion ?? 0.6,
        imageCostUsd: settings?.aiImageCostUsd ?? 0.04,
        creditPackUsd: settings?.aiCreditPackUsd ?? 10,
        creditsPerPackCents: settings?.aiCreditsPerPackCents ?? 1000,
      }),
    [settings],
  );

  async function save() {
    if (!settings) return;
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/admin/settings/ai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openaiApiKey: openaiApiKey.trim() || undefined,
        aiEnabled: settings.aiEnabled,
        aiProfitMarginPercent: settings.aiProfitMarginPercent,
        aiTextInputCostPerMillion: settings.aiTextInputCostPerMillion,
        aiTextOutputCostPerMillion: settings.aiTextOutputCostPerMillion,
        aiImageCostUsd: settings.aiImageCostUsd,
        aiCreditPackUsd: settings.aiCreditPackUsd,
        aiCreditsPerPackCents: settings.aiCreditsPerPackCents,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error || "Save failed");
      return;
    }
    setSettings(data.settings);
    setOpenaiApiKey("");
    setStatus("AI settings saved. Client prices updated automatically.");
  }

  function update<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  if (loading || !settings) {
    return <p className="text-sm text-muted-foreground">Loading AI settings...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI & credits</h1>
        <p className="text-muted-foreground">
          OpenAI is configured here only. Clients use AI credits — your profit margin is applied to
          provider costs automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OpenAI API</CardTitle>
          <CardDescription>Never shown to clients. Required for text and image generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.aiEnabled}
              onChange={(e) => update("aiEnabled", e.target.checked)}
            />
            Enable AI for clients
          </label>
          {settings.hasOpenaiApiKey ? (
            <p className="text-sm text-muted-foreground">
              Current key: <code className="rounded bg-muted px-1">{settings.openaiApiKeyMasked}</code>
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="openai-key">API key</Label>
            <Input
              id="openai-key"
              type="password"
              placeholder="sk-..."
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & margin</CardTitle>
          <CardDescription>
            Provider costs below are what OpenAI charges you. Client prices = cost ÷ (1 − margin%).
            Default margin is 80%.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Profit margin (%)</Label>
            <Input
              type="number"
              min={0}
              max={99}
              value={settings.aiProfitMarginPercent}
              onChange={(e) => update("aiProfitMarginPercent", Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Text input cost / 1M tokens (USD)</Label>
            <Input
              type="number"
              step="0.01"
              value={settings.aiTextInputCostPerMillion}
              onChange={(e) => update("aiTextInputCostPerMillion", Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Text output cost / 1M tokens (USD)</Label>
            <Input
              type="number"
              step="0.01"
              value={settings.aiTextOutputCostPerMillion}
              onChange={(e) => update("aiTextOutputCostPerMillion", Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Image cost each (USD)</Label>
            <Input
              type="number"
              step="0.01"
              value={settings.aiImageCostUsd}
              onChange={(e) => update("aiImageCostUsd", Number(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client price preview</CardTitle>
          <CardDescription>Updates when you change margin or provider costs</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>Text input / 1M tokens: <strong>${preview?.textInputPerMillionUsd.toFixed(4)}</strong></p>
          <p>Text output / 1M tokens: <strong>${preview?.textOutputPerMillionUsd.toFixed(4)}</strong></p>
          <p>Per image: <strong>${preview?.imageUsd.toFixed(2)}</strong></p>
          <p>Est. caption (~500+300 tokens): <strong>${preview?.estimatedTextPostUsd.toFixed(4)}</strong></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit packs</CardTitle>
          <CardDescription>
            Set how much clients pay per pack. They receive the same dollar amount in AI credits (e.g. pay
            $10 → $10 credits). Your {settings.aiProfitMarginPercent}% profit applies when they generate
            text/images — see the price preview above. PayPal/GCash numbers are in{" "}
            <a href="/admin/settings/payments" className="text-primary underline">
              Payment details
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pack price (USD)</Label>
            <Input
              type="number"
              min={1}
              value={settings.aiCreditPackUsd}
              onChange={(e) => {
                const price = Number(e.target.value) || 1;
                update("aiCreditPackUsd", price);
                update("aiCreditsPerPackCents", Math.round(price * 100));
              }}
            />
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="font-medium">What clients see at checkout</p>
            <p className="mt-2 text-muted-foreground">
              Pay <strong>${settings.aiCreditPackUsd.toFixed(2)}</strong> → receive{" "}
              <strong>${(settings.aiCreditsPerPackCents / 100).toFixed(2)}</strong> AI credits
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Example usage from balance: ~{Math.floor((settings.aiCreditsPerPackCents / 100) / (preview?.estimatedTextPostUsd || 0.01))} captions or ~{Math.floor((settings.aiCreditsPerPackCents / 100) / (preview?.imageUsd || 0.2))} images at current prices.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save AI settings"}
        </Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </div>
    </div>
  );
}

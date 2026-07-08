"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/branding/site-logo";
import { invalidateBrandingCache } from "@/hooks/use-site-branding";

type BrandingSettings = {
  title: string;
  product: string;
  description: string;
  logoUrl: string;
  logoDarkUrl: string;
  logoHeightPx: number;
  faviconUrl: string;
  domain: string;
  tagline: string;
  activityFeedDisplayCount: number;
  activityFeedSimulatedEnabled: boolean;
};

export default function AdminBrandingPage() {
  const [settings, setSettings] = useState<BrandingSettings>({
    title: "",
    product: "",
    description: "",
    logoUrl: "",
    logoDarkUrl: "",
    logoHeightPx: 40,
    faviconUrl: "",
    domain: "",
    tagline: "",
    activityFeedDisplayCount: 20,
    activityFeedSimulatedEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "logoDark" | "favicon" | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/settings/branding");
      const data = await res.json();
      setLoading(false);
      if (res.ok) setSettings(data.settings);
    }
    load();
  }, []);

  async function uploadAsset(file: File, field: "logoUrl" | "logoDarkUrl" | "faviconUrl") {
    setUploading(
      field === "logoUrl" ? "logo" : field === "logoDarkUrl" ? "logoDark" : "favicon",
    );
    setStatus("");
    try {
      const presign = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      const urls = await presign.json();
      if (!presign.ok) throw new Error(urls.error || "Upload setup failed");

      const put = await fetch(urls.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");

      setSettings((s) => ({ ...s, [field]: urls.publicUrl }));
      setStatus(
        `${field === "logoUrl" ? "Logo" : field === "logoDarkUrl" ? "Dark logo" : "Favicon"} uploaded`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/admin/settings/branding", {
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
    invalidateBrandingCache();
    setStatus("Branding saved. Refresh the homepage to see favicon changes.");
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading branding settings...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Branding</h1>
        <p className="text-muted-foreground">
          Customize your site title, description, logo, and favicon shown across the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>How your brand appears in the header</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
          <SiteLogo branding={settings} forceTheme="light" />
          {settings.logoDarkUrl ? <SiteLogo branding={settings} forceTheme="dark" /> : null}
          <div>
            <p className="font-medium">{settings.title}</p>
            <p className="text-sm text-muted-foreground">{settings.product}</p>
            <p className="text-xs text-muted-foreground">Height: {settings.logoHeightPx}px</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site text</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Site title</Label>
            <Input
              id="title"
              value={settings.title}
              onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
              placeholder="VCC & Bank"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product">Product name</Label>
            <Input
              id="product"
              value={settings.product}
              onChange={(e) => setSettings((s) => ({ ...s, product: e.target.value }))}
              placeholder="Digital Growth Suite"
            />
            <p className="text-xs text-muted-foreground">Shown in badges and browser tab (title — product).</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Site description</Label>
            <Textarea
              id="description"
              rows={5}
              value={settings.description}
              onChange={(e) => setSettings((s) => ({ ...s, description: e.target.value }))}
              placeholder="Short description for homepage hero and search engines..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo (light theme)</CardTitle>
          <CardDescription>Recommended: PNG or SVG, transparent background, at least 200px wide</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={uploading === "logo"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAsset(file, "logoUrl");
            }}
          />
          {settings.logoUrl ? (
            <p className="break-all text-xs text-muted-foreground">Current: {settings.logoUrl}</p>
          ) : null}
          {uploading === "logo" ? <p className="text-sm text-muted-foreground">Uploading logo...</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo (dark theme)</CardTitle>
          <CardDescription>Shown when users switch to dark mode. Falls back to light logo if empty.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={uploading === "logoDark"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAsset(file, "logoDarkUrl");
            }}
          />
          {settings.logoDarkUrl ? (
            <p className="break-all text-xs text-muted-foreground">Current: {settings.logoDarkUrl}</p>
          ) : null}
          {uploading === "logoDark" ? (
            <p className="text-sm text-muted-foreground">Uploading dark logo...</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo size</CardTitle>
          <CardDescription>Height in pixels (24–120). Width scales automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="range"
            min={24}
            max={120}
            value={settings.logoHeightPx}
            onChange={(e) =>
              setSettings((s) => ({ ...s, logoHeightPx: Number(e.target.value) }))
            }
            className="w-full"
          />
          <Input
            type="number"
            min={24}
            max={120}
            value={settings.logoHeightPx}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                logoHeightPx: Math.min(120, Math.max(24, Number(e.target.value) || 40)),
              }))
            }
            className="w-32"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favicon</CardTitle>
          <CardDescription>Recommended: 32×32 or 64×64 PNG, or .ico file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
            disabled={uploading === "favicon"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAsset(file, "faviconUrl");
            }}
          />
          {settings.faviconUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.faviconUrl} alt="Favicon preview" className="h-8 w-8 rounded border object-contain" />
              <p className="break-all text-xs text-muted-foreground">{settings.faviconUrl}</p>
            </div>
          ) : null}
          {uploading === "favicon" ? <p className="text-sm text-muted-foreground">Uploading favicon...</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard activity feed</CardTitle>
          <CardDescription>
            Control how many entries appear in Recent publishing activity. Real posts are always shown; sample
            entries fill the list when you have fewer than the target count (minimum 20).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-count">Entries to show</Label>
            <Input
              id="activity-count"
              type="number"
              min={20}
              max={100}
              value={settings.activityFeedDisplayCount}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  activityFeedDisplayCount: Math.max(20, Number(e.target.value) || 20),
                }))
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">Minimum 20. Real posts are always included.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.activityFeedSimulatedEnabled}
              onChange={(e) =>
                setSettings((s) => ({ ...s, activityFeedSimulatedEnabled: e.target.checked }))
              }
            />
            Fill with sample activity when real posts are below the target count
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save branding"}
        </Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </div>
    </div>
  );
}

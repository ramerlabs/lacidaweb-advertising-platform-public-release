"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type LicenseState = {
  active: boolean;
  licenseKeyMasked: string;
  status: string | null;
  expiresAt: string | null;
  message: string | null;
  lastValidatedAt: string | null;
};

export default function AdminLicensePage() {
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/license");
    const data = await res.json();
    setLoading(false);
    if (res.ok) setLicense(data.license);
    else setStatus(data.error || "Failed to load license");
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(action: "activate" | "validate" | "deactivate") {
    setBusy(true);
    setStatus("");
    const res = await fetch("/api/admin/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        licenseKey: action === "activate" ? key : undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.error || "Action failed");
      return;
    }
    setLicense(data.license);
    setStatus(data.message || "Done");
    if (action === "activate") setKey("");
  }

  if (loading && !license) {
    return <p className="text-sm text-muted-foreground">Loading license...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">License</h1>
        <p className="text-muted-foreground">
          Activate your lacidaweb license key. Purchase and manage licenses through RamerLabs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current status</CardTitle>
          <CardDescription>Only the license key is shown here — no internal server details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={license?.active ? "success" : "warning"}>
              {license?.active ? "Active" : "Inactive"}
            </Badge>
            {license?.status ? <Badge variant="outline">{license.status}</Badge> : null}
          </div>
          <p className="text-sm">
            Key: <span className="font-mono">{license?.licenseKeyMasked || "—"}</span>
          </p>
          {license?.expiresAt ? (
            <p className="text-sm text-muted-foreground">Expires: {license.expiresAt}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Lifetime / no expiry on file</p>
          )}
          {license?.lastValidatedAt ? (
            <p className="text-xs text-muted-foreground">
              Last checked: {new Date(license.lastValidatedAt).toLocaleString()}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" disabled={busy} onClick={() => run("validate")}>
              Re-validate
            </Button>
            <Button
              variant="outline"
              className="text-rose-700"
              disabled={busy || !license?.licenseKeyMasked}
              onClick={() => run("deactivate")}
            >
              Deactivate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activate license key</CardTitle>
          <CardDescription>Paste the key you received after purchasing lacidaweb.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="license-key">License key</Label>
            <Input
              id="license-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
            />
          </div>
          <Button disabled={busy || key.trim().length < 8} onClick={() => run("activate")}>
            {busy ? "Working..." : "Activate"}
          </Button>
        </CardContent>
      </Card>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}

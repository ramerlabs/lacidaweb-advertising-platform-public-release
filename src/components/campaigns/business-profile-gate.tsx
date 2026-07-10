"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTeam } from "@/components/dashboard/team-provider";

export type BusinessFormState = {
  businessName: string;
  businessDescription: string;
  businessIndustry: string;
  businessAudience: string;
  businessWebsite: string;
  businessLocation: string;
  brandVoice: string;
};

const EMPTY: BusinessFormState = {
  businessName: "",
  businessDescription: "",
  businessIndustry: "",
  businessAudience: "",
  businessWebsite: "",
  businessLocation: "",
  brandVoice: "",
};

export function BusinessProfileGate({
  onReady,
  compact,
}: {
  onReady?: () => void;
  compact?: boolean;
}) {
  const { teamId } = useTeam();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<BusinessFormState>(EMPTY);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/teams/business?teamId=${encodeURIComponent(teamId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.profile) {
          setForm({
            businessName: data.profile.businessName || "",
            businessDescription: data.profile.businessDescription || "",
            businessIndustry: data.profile.businessIndustry || "",
            businessAudience: data.profile.businessAudience || "",
            businessWebsite: data.profile.businessWebsite || "",
            businessLocation: data.profile.businessLocation || "",
            brandVoice: data.profile.brandVoice || "",
          });
        }
        const isComplete = Boolean(data.complete);
        setComplete(isComplete);
        if (isComplete) onReady?.();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally omit onReady — parent often passes an inline callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function save() {
    if (!teamId) return;
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/teams/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, ...form }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error || "Could not save business details");
      return;
    }
    setComplete(Boolean(data.complete));
    setStatus(data.complete ? "Business profile saved." : "Saved — add a name/industry and description.");
    if (data.complete) onReady?.();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Checking business profile…</p>;
  }

  if (complete) {
    return (
      <p className="text-xs text-muted-foreground">
        AI uses your{" "}
        <Link href="/dashboard/settings" className="underline underline-offset-2">
          business profile
        </Link>
        .
      </p>
    );
  }

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
          : "rounded-xl border border-amber-500/30 bg-amber-500/5 p-5"
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-amber-600" />
        <p className="text-sm font-semibold">Tell us about your business</p>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Required before AI can write ad creatives. Saved to your workspace and reused for future
        campaigns.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Business / brand name</Label>
          <Input
            value={form.businessName}
            onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
            placeholder="Acme Coffee"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Industry</Label>
          <Input
            value={form.businessIndustry}
            onChange={(e) => setForm((f) => ({ ...f, businessIndustry: e.target.value }))}
            placeholder="Food & beverage"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input
            value={form.businessWebsite}
            onChange={(e) => setForm((f) => ({ ...f, businessWebsite: e.target.value }))}
            placeholder="https://"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>What do you sell / offer?</Label>
          <Textarea
            rows={3}
            value={form.businessDescription}
            onChange={(e) => setForm((f) => ({ ...f, businessDescription: e.target.value }))}
            placeholder="Short description of your products or services"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Target audience</Label>
          <Input
            value={form.businessAudience}
            onChange={(e) => setForm((f) => ({ ...f, businessAudience: e.target.value }))}
            placeholder="Busy professionals who want better coffee"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input
            value={form.businessLocation}
            onChange={(e) => setForm((f) => ({ ...f, businessLocation: e.target.value }))}
            placeholder="Manila, PH"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Brand voice</Label>
          <Input
            value={form.brandVoice}
            onChange={(e) => setForm((f) => ({ ...f, brandVoice: e.target.value }))}
            placeholder="Friendly, premium, playful"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save business details"}
        </Button>
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </div>
    </div>
  );
}

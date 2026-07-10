"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Campaign = {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  objective: string | null;
  lifecycleStatus: string;
  budgetAmount: number;
  budgetType: string;
  paymentStatus: string;
  createdAt: string;
  countries?: string[];
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
  lifetimeSpendCents?: number;
  clientChargeUsd?: number;
  headline: string | null;
  primaryText?: string | null;
  destinationUrl?: string | null;
  ctaLabel?: string | null;
  imageUrl: string | null;
  videoUrl?: string | null;
  format?: string | null;
  adCount?: number;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "danger" | "warning"> = {
  PENDING_REVIEW: "warning",
  APPROVED: "default",
  REJECTED: "danger",
  ACTIVE: "default",
  PAUSED: "secondary",
};

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function CampaignHoverTip({ campaign }: { campaign: Campaign }) {
  const spent = (campaign.lifetimeSpendCents || 0) / 100;
  const reserved = campaign.clientChargeUsd || campaign.budgetAmount || 0;
  const countries = campaign.countries?.length ? campaign.countries.join(", ") : "—";

  return (
    <div
      className="w-full rounded-xl border border-cyan-500/30 bg-zinc-950 p-3 text-left shadow-lg"
      role="tooltip"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">Ad details preview</p>
      <p className="mt-1 text-sm font-medium text-zinc-100">{campaign.name}</p>
      <dl className="mt-2 space-y-1 text-xs text-zinc-300">
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Advertiser</dt>
          <dd>{campaign.teamName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Objective</dt>
          <dd>{campaign.objective || "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Budget</dt>
          <dd>
            {money(campaign.budgetAmount)} {campaign.budgetType}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Reserved / spent</dt>
          <dd>
            {money(reserved)} / {money(spent)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Payment</dt>
          <dd>{campaign.paymentStatus.replace(/_/g, " ")}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Countries</dt>
          <dd className="max-w-[12rem] truncate text-right">{countries}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Format</dt>
          <dd>{campaign.format || "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Created</dt>
          <dd>{new Date(campaign.createdAt).toLocaleString()}</dd>
        </div>
      </dl>
      {campaign.headline ? (
        <div className="mt-2 border-t border-zinc-800 pt-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Headline</p>
          <p className="mt-0.5 text-xs text-zinc-200">{campaign.headline}</p>
        </div>
      ) : null}
      {campaign.primaryText ? (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Primary text</p>
          <p className="mt-0.5 line-clamp-4 text-xs text-zinc-400">{campaign.primaryText}</p>
        </div>
      ) : null}
      {campaign.destinationUrl ? (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Destination</p>
          <p className="mt-0.5 break-all text-xs text-cyan-400">{campaign.destinationUrl}</p>
        </div>
      ) : null}
      {campaign.ctaLabel ? (
        <p className="mt-2 text-xs text-zinc-400">
          CTA: <span className="text-zinc-200">{campaign.ctaLabel}</span>
        </p>
      ) : null}
      {campaign.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={campaign.imageUrl}
          alt=""
          className="mt-2 max-h-28 w-full rounded-md object-cover"
        />
      ) : null}
    </div>
  );
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/campaigns");
    const data = await res.json();
    if (res.ok) setCampaigns(data.campaigns || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = campaigns.find((c) => c.id === selectedId) || null;
  const hovered = campaigns.find((c) => c.id === hoveredId) || null;

  async function runAction(action: "APPROVED" | "REJECTED" | "PAUSE" | "RESUME" | "DELETE") {
    if (!selected) return;
    if (action === "DELETE") {
      const ok = window.confirm(
        `Delete campaign "${selected.name}" for ${selected.teamName}? This cannot be undone.`,
      );
      if (!ok) return;
    }
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/admin/campaigns?id=${encodeURIComponent(selected.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes: notes || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Action failed");
      return;
    }
    const labels: Record<string, string> = {
      APPROVED: "Campaign approved",
      REJECTED:
        typeof data.refundUsd === "string" && Number(data.refundUsd) > 0
          ? `Campaign rejected — $${data.refundUsd} refunded to wallet`
          : "Campaign rejected",
      PAUSE: "Campaign paused",
      RESUME: "Campaign resumed",
      DELETE: "Campaign deleted",
    };
    setMessage(labels[action] || "Updated");
    setNotes("");
    if (action === "DELETE") setSelectedId(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaign review</h1>
        <p className="text-muted-foreground">
          Approve, reject, pause, or delete advertiser campaigns. Hover a queue item for full ad
          details.
        </p>
      </div>

      {message ? (
        <p className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-800 dark:text-cyan-200">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Queue</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : `${campaigns.length} campaigns · hover for details`}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[520px] space-y-2 overflow-y-auto">
            {campaigns.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">No campaigns submitted yet.</p>
            ) : null}
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                onClick={() => setSelectedId(campaign.id)}
                onMouseEnter={() => setHoveredId(campaign.id)}
                onMouseLeave={() => setHoveredId((id) => (id === campaign.id ? null : id))}
                onFocus={() => setHoveredId(campaign.id)}
                onBlur={() => setHoveredId((id) => (id === campaign.id ? null : id))}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedId === campaign.id
                    ? "border-cyan-500/50 bg-cyan-500/5"
                    : "hover:border-zinc-300 hover:bg-muted/50 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.teamName} · ${campaign.budgetAmount} {campaign.budgetType}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[campaign.lifecycleStatus] || "outline"}>
                    {campaign.lifecycleStatus.replace(/_/g, " ")}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {hovered && hovered.id !== selectedId ? (
            <CampaignHoverTip campaign={hovered} />
          ) : null}

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Manage</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Select a campaign to manage. Hover a queue item to preview full ad details.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold">{selected.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selected.teamName} · {selected.objective} · {selected.paymentStatus}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Status: {selected.lifecycleStatus.replace(/_/g, " ")}
                  </p>
                </div>

                <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-xs sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Countries:</span>{" "}
                    {selected.countries?.join(", ") || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Format:</span> {selected.format || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Reserved:</span>{" "}
                    {money(selected.clientChargeUsd || selected.budgetAmount)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Spent:</span>{" "}
                    {money((selected.lifetimeSpendCents || 0) / 100)}
                  </p>
                  <p className="sm:col-span-2">
                    <span className="text-muted-foreground">Destination:</span>{" "}
                    {selected.destinationUrl ? (
                      <a
                        href={selected.destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-600 underline-offset-2 hover:underline dark:text-cyan-400"
                      >
                        {selected.destinationUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>

                {selected.headline ? (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <p className="font-medium">{selected.headline}</p>
                    {selected.primaryText ? (
                      <p className="mt-1 text-muted-foreground">{selected.primaryText}</p>
                    ) : null}
                    {selected.ctaLabel ? (
                      <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {selected.ctaLabel}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.imageUrl} alt="" className="max-h-40 rounded-lg object-cover" />
                ) : null}
                <Textarea
                  placeholder="Rejection notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
                <div className="flex flex-wrap gap-2">
                  {selected.lifecycleStatus === "PENDING_REVIEW" ? (
                    <>
                      <Button
                        disabled={busy}
                        onClick={() => runAction("APPROVED")}
                        className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
                      >
                        Approve
                      </Button>
                      <Button variant="outline" disabled={busy} onClick={() => runAction("REJECTED")}>
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {["ACTIVE", "APPROVED"].includes(selected.lifecycleStatus) ? (
                    <Button variant="outline" disabled={busy} onClick={() => runAction("PAUSE")}>
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                  ) : null}
                  {selected.lifecycleStatus === "PAUSED" ? (
                    <Button variant="outline" disabled={busy} onClick={() => runAction("RESUME")}>
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    className="border-rose-300 text-rose-700"
                    disabled={busy}
                    onClick={() => runAction("DELETE")}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

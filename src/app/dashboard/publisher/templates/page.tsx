"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { useTeam } from "@/components/dashboard/team-provider";
import { AdTemplatePreview } from "@/components/publisher/ad-template-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildEmbedSnippet } from "@/lib/publisher-embed";
import {
  DISPLAY_TEMPLATES,
  PUBLISHER_AD_TEMPLATES,
  TEXT_TEMPLATES,
  type PublisherAdTemplate,
} from "@/lib/publisher-ad-templates";

type Site = { id: string; name: string; domain: string };

type CreatedPlacement = {
  placementKey: string;
  templateId: string;
  siteId: string;
};

export default function PublisherTemplatesPage() {
  const { teamId } = useTeam();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedPlacement | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/publisher/sites?teamId=${encodeURIComponent(teamId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          const list = (data.sites || []) as Site[];
          setSites(list);
          if (list.length) setSelectedSiteId(list[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  async function addPlacement(template: PublisherAdTemplate) {
    if (!teamId || !selectedSiteId) {
      setError("Register a website first under Websites & embed.");
      return;
    }
    setBusy(true);
    setError("");
    setCreated(null);

    const res = await fetch("/api/publisher/placements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        siteId: selectedSiteId,
        templateId: template.id,
        name: template.name,
      }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error || "Failed to create placement");
      return;
    }

    setActiveTemplate(template.id);
    setCreated({
      placementKey: data.placement.placementKey,
      templateId: template.id,
      siteId: selectedSiteId,
    });
  }

  async function copySnippet(placementKey: string) {
    await navigator.clipboard.writeText(buildEmbedSnippet(placementKey));
    setCopiedKey(placementKey);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Publisher
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Ad templates</h1>
        <p className="text-muted-foreground">
          Choose a display or text ad format, preview it, and copy the embed code for your site
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Target website</CardTitle>
          <CardDescription>Select which registered site this placement belongs to</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading sites...</p>
          ) : sites.length === 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">No websites yet.</p>
              <Button asChild size="sm" variant="outline">
                <a href="/dashboard/publisher/sites">Register website</a>
              </Button>
            </div>
          ) : (
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="flex h-10 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.domain})
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <TemplateSection
        title="Display ads"
        description="Image + headline banners for headers, sidebars, and in-content slots"
        templates={DISPLAY_TEMPLATES}
        activeTemplate={activeTemplate}
        created={created}
        busy={busy}
        copiedKey={copiedKey}
        onSelect={addPlacement}
        onCopy={copySnippet}
      />

      <TemplateSection
        title="Text ads"
        description="Lightweight sponsored links and native text units — no image required"
        templates={TEXT_TEMPLATES}
        activeTemplate={activeTemplate}
        created={created}
        busy={busy}
        copiedKey={copiedKey}
        onSelect={addPlacement}
        onCopy={copySnippet}
      />

      {created && activeTemplate ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle>Your embed code</CardTitle>
            <CardDescription>
              Paste this on your site where the{" "}
              {PUBLISHER_AD_TEMPLATES.find((t) => t.id === activeTemplate)?.name} should appear
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs text-emerald-300">
              {buildEmbedSnippet(created.placementKey)}
            </pre>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500"
              onClick={() => copySnippet(created.placementKey)}
            >
              {copiedKey === created.placementKey ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy embed code
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function TemplateSection({
  title,
  description,
  templates,
  activeTemplate,
  created,
  busy,
  copiedKey,
  onSelect,
  onCopy,
}: {
  title: string;
  description: string;
  templates: PublisherAdTemplate[];
  activeTemplate: string | null;
  created: CreatedPlacement | null;
  busy: boolean;
  copiedKey: string | null;
  onSelect: (t: PublisherAdTemplate) => void;
  onCopy: (key: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const isActive = activeTemplate === template.id;
          const hasCode =
            created?.templateId === template.id && created.placementKey;

          return (
            <Card
              key={template.id}
              className={isActive ? "border-emerald-500/40 ring-1 ring-emerald-500/20" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Badge variant={template.category === "text" ? "secondary" : "default"}>
                    {template.category === "text" ? "Text" : "Display"}
                  </Badge>
                </div>
                <CardDescription>{template.description}</CardDescription>
                {template.width > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {template.width}×{template.height}px
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Responsive text unit</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <AdTemplatePreview template={template} compact />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500"
                    disabled={busy}
                    onClick={() => onSelect(template)}
                  >
                    <Plus className="h-4 w-4" />
                    Get embed code
                  </Button>
                  {hasCode ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onCopy(created!.placementKey)}
                    >
                      {copiedKey === created!.placementKey ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copy
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

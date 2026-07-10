"use client";

import { Eye, MousePointerClick, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampaignAiAssistant } from "@/components/campaigns/campaign-ai-assistant";
import { CAMPAIGN_OBJECTIVES } from "@/lib/campaign-constants";
import { cn } from "@/lib/utils";
import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";
import type { CampaignObjective } from "@/types/lacidaweb";

const ICONS = {
  AWARENESS: Eye,
  TRAFFIC: MousePointerClick,
  CONVERSIONS: Target,
} as const;

const OBJECTIVES = new Set(["AWARENESS", "TRAFFIC", "CONVERSIONS"]);

export function ObjectiveStep() {
  const { name, objective, setName, setObjective } = useCampaignWizardStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Choose your campaign objective</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What do you want to achieve? This guides how we optimize delivery.
        </p>
      </div>

      <CampaignAiAssistant
        step="objective"
        title="AI: suggest objective & name"
        placeholder="e.g. Promote summer sale to US shoppers"
        context={{ name, objective: objective || undefined }}
        onApply={(suggestion) => {
          if (typeof suggestion.name === "string" && suggestion.name.trim()) {
            setName(suggestion.name.trim().slice(0, 120));
          }
          const obj = String(suggestion.objective || "").toUpperCase();
          if (OBJECTIVES.has(obj)) setObjective(obj as CampaignObjective);
        }}
      />

      <div className="space-y-2">
        <Label htmlFor="campaign-name">Campaign name</Label>
        <Input
          id="campaign-name"
          placeholder="e.g. Summer Sale — US Traffic"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {CAMPAIGN_OBJECTIVES.map((item) => {
          const Icon = ICONS[item.id];
          const selected = objective === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setObjective(item.id as CampaignObjective)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "hover:border-primary/40 hover:bg-muted/50",
              )}
            >
              <Icon className={cn("mb-3 h-6 w-6", selected ? "text-primary" : "text-muted-foreground")} />
              <p className="font-semibold">{item.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

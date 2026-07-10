"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampaignAiAssistant } from "@/components/campaigns/campaign-ai-assistant";
import { COUNTRY_OPTIONS, INTEREST_SUGGESTIONS } from "@/lib/campaign-constants";
import { cn } from "@/lib/utils";
import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";

const VALID_COUNTRIES = new Set(COUNTRY_OPTIONS.map((c) => c.code));

export function AudienceStep() {
  const { targeting, setTargeting, name, objective } = useCampaignWizardStore();
  const [keywordInput, setKeywordInput] = useState("");

  function toggleCountry(code: string) {
    const countries = targeting.location.countries.includes(code)
      ? targeting.location.countries.filter((c) => c !== code)
      : [...targeting.location.countries, code];
    setTargeting({
      ...targeting,
      location: { ...targeting.location, countries },
    });
  }

  function toggleInterest(interest: string) {
    const interests = targeting.interests || [];
    const next = interests.includes(interest)
      ? interests.filter((i) => i !== interest)
      : [...interests, interest];
    setTargeting({ ...targeting, interests: next });
  }

  function addKeyword() {
    const value = keywordInput.trim();
    if (!value) return;
    const keywords = targeting.keywords || [];
    if (keywords.includes(value)) {
      setKeywordInput("");
      return;
    }
    setTargeting({ ...targeting, keywords: [...keywords, value] });
    setKeywordInput("");
  }

  function removeKeyword(keyword: string) {
    setTargeting({
      ...targeting,
      keywords: (targeting.keywords || []).filter((k) => k !== keyword),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Define your audience</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Target the people most likely to respond to your ads.
        </p>
      </div>

      <CampaignAiAssistant
        step="audience"
        title="AI: suggest audience"
        placeholder="e.g. Parents in PH and US interested in education"
        context={{ name, objective: objective || undefined, targeting }}
        onApply={(suggestion) => {
          const ageMin = Math.min(65, Math.max(13, Number(suggestion.ageMin) || 18));
          const ageMax = Math.min(65, Math.max(ageMin, Number(suggestion.ageMax) || 45));
          const genderRaw = String(suggestion.gender || "ALL").toLowerCase();
          const genders: ("male" | "female" | "all")[] =
            genderRaw === "male" || genderRaw === "female" ? [genderRaw] : ["all"];
          const countries = (
            Array.isArray(suggestion.countries)
              ? suggestion.countries.map((c) => String(c).toUpperCase())
              : targeting.location.countries
          ).filter((c): c is (typeof COUNTRY_OPTIONS)[number]["code"] =>
            VALID_COUNTRIES.has(c as (typeof COUNTRY_OPTIONS)[number]["code"]),
          );
          const interests = Array.isArray(suggestion.interests)
            ? suggestion.interests.map((i) => String(i)).filter(Boolean).slice(0, 8)
            : targeting.interests || [];
          const keywords = Array.isArray(suggestion.keywords)
            ? suggestion.keywords.map((k) => String(k)).filter(Boolean).slice(0, 10)
            : targeting.keywords || [];
          setTargeting({
            ...targeting,
            demographics: { ...targeting.demographics, ageMin, ageMax, genders },
            location: {
              ...targeting.location,
              countries: countries.length ? countries : targeting.location.countries,
            },
            interests,
            keywords,
          });
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="age-min">Age min</Label>
          <Input
            id="age-min"
            type="number"
            min={13}
            max={65}
            value={targeting.demographics?.ageMin ?? 18}
            onChange={(e) =>
              setTargeting({
                ...targeting,
                demographics: {
                  ...targeting.demographics,
                  ageMin: Number(e.target.value),
                },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="age-max">Age max</Label>
          <Input
            id="age-max"
            type="number"
            min={13}
            max={65}
            value={targeting.demographics?.ageMax ?? 65}
            onChange={(e) =>
              setTargeting({
                ...targeting,
                demographics: {
                  ...targeting.demographics,
                  ageMax: Number(e.target.value),
                },
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Gender</Label>
        <div className="flex flex-wrap gap-2">
          {(["all", "male", "female"] as const).map((gender) => {
            const selected = targeting.demographics?.genders?.includes(gender);
            return (
              <Button
                key={gender}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                onClick={() =>
                  setTargeting({
                    ...targeting,
                    demographics: { ...targeting.demographics, genders: [gender] },
                  })
                }
              >
                {gender === "all" ? "All" : gender.charAt(0).toUpperCase() + gender.slice(1)}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Countries</Label>
        <div className="flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map((country) => {
            const selected = targeting.location.countries.includes(country.code);
            return (
              <button
                key={country.code}
                type="button"
                onClick={() => toggleCountry(country.code)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:border-primary/50",
                )}
              >
                {country.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Interests</Label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_SUGGESTIONS.map((interest) => {
            const selected = targeting.interests?.includes(interest);
            return (
              <Badge
                key={interest}
                variant={selected ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="keywords">Keywords</Label>
        <div className="flex gap-2">
          <Input
            id="keywords"
            placeholder="Add keyword and press Enter"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyword();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addKeyword}>
            Add
          </Button>
        </div>
        {(targeting.keywords || []).length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {(targeting.keywords || []).map((keyword) => (
              <Badge key={keyword} variant="secondary" className="gap-1 pr-1">
                {keyword}
                <button type="button" onClick={() => removeKeyword(keyword)} aria-label={`Remove ${keyword}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WizardProgress } from "@/components/campaigns/wizard-progress";
import { AudienceStep } from "@/components/campaigns/steps/audience-step";
import { BudgetStep } from "@/components/campaigns/steps/budget-step";
import { CreativeStep } from "@/components/campaigns/steps/creative-step";
import { ObjectiveStep } from "@/components/campaigns/steps/objective-step";
import { useTeam } from "@/components/dashboard/team-provider";
import { CAMPAIGN_OBJECTIVES, ADVERTISER_AD_FORMATS } from "@/lib/campaign-constants";
import { toClientFacingMessage } from "@/lib/client-errors";
import {
  useCampaignWizardStore,
  validateWizardStep,
} from "@/stores/campaign-wizard-store";

export function CampaignWizard() {
  const router = useRouter();
  const { teamId } = useTeam();
  const store = useCampaignWizardStore();
  const { step, nextStep, prevStep, reset } = store;
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleNext() {
    const validationError = validateWizardStep(step, store);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    nextStep();
  }

  async function handleSubmit() {
    const validationError = validateWizardStep(4, store);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!teamId || !store.objective) {
      setError("Select a workspace and complete all steps");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      teamId,
      name: store.name.trim(),
      objective: store.objective,
      targeting: store.targeting,
      budgetType: store.budgetType,
      budgetAmountUsd: Number(store.budgetAmountUsd),
      scheduleStart: store.scheduleStart ? new Date(store.scheduleStart).toISOString() : undefined,
      scheduleEnd: store.scheduleEnd ? new Date(store.scheduleEnd).toISOString() : undefined,
      ads: store.ads.map((ad) => ({
        ...ad,
        primaryText: ad.format === "TEXT_INLINE" ? ad.headline : ad.primaryText,
        imageUrl: ad.format === "IMAGE" ? ad.imageUrl || undefined : undefined,
        videoUrl: ad.format === "VIDEO" ? ad.videoUrl || undefined : undefined,
      })),
      platform: "lacidaweb",
    };

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const apiError =
          typeof data.error === "string"
            ? data.error
            : data.error?.formErrors?.[0] || "Failed to create campaign";
        throw new Error(apiError);
      }
      setSuccess(true);
      reset();
      setTimeout(() => router.push("/dashboard/campaigns"), 1500);
    } catch (submitError) {
      setError(toClientFacingMessage(submitError instanceof Error ? submitError.message : "Submit failed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h2 className="text-xl font-semibold">Campaign submitted!</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Your campaign is pending review. Fund your wallet so it can go live after approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  const objectiveLabel = CAMPAIGN_OBJECTIVES.find((o) => o.id === store.objective)?.label;

  return (
    <div className="space-y-6">
      <WizardProgress currentStep={step} />

      <Card>
        <CardContent className="pt-6">
          {step === 1 ? <ObjectiveStep /> : null}
          {step === 2 ? <AudienceStep /> : null}
          {step === 3 ? <BudgetStep /> : null}
          {step === 4 ? <CreativeStep /> : null}

          {step === 4 ? (
            <div className="mt-8 rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">Review summary</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>
                  <span className="text-foreground">Campaign:</span> {store.name}
                </li>
                <li>
                  <span className="text-foreground">Objective:</span> {objectiveLabel}
                </li>
                <li>
                  <span className="text-foreground">Countries:</span>{" "}
                  {store.targeting.location.countries.join(", ")}
                </li>
                <li>
                  <span className="text-foreground">Budget:</span> ${store.budgetAmountUsd}{" "}
                  {store.budgetType === "DAILY" ? "daily" : "lifetime"}
                </li>
                <li>
                  <span className="text-foreground">Ad type:</span>{" "}
                  {ADVERTISER_AD_FORMATS.find((f) => f.id === store.ads[0]?.format)?.label || "—"}
                </li>
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            <div>
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => { setError(""); prevStep(); }}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <Button asChild variant="ghost">
                  <Link href="/dashboard/campaigns">
                    <ArrowLeft className="h-4 w-4" />
                    Cancel
                  </Link>
                </Button>
              )}
            </div>

            {step < 4 ? (
              <Button type="button" onClick={handleNext}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit for review"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

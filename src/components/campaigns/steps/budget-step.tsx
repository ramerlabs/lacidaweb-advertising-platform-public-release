"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";
import type { BudgetType } from "@/types/lacidaweb";

export function BudgetStep() {
  const {
    budgetType,
    budgetAmountUsd,
    scheduleStart,
    scheduleEnd,
    setBudgetType,
    setBudgetAmountUsd,
    setScheduleStart,
    setScheduleEnd,
  } = useCampaignWizardStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Budget &amp; schedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set how much you want to spend and when your campaign should run.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Budget type</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { id: "DAILY" as BudgetType, label: "Daily budget", hint: "Average spend per day" },
              { id: "LIFETIME" as BudgetType, label: "Lifetime budget", hint: "Total spend for the campaign" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setBudgetType(option.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                budgetType === option.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "hover:border-primary/40 hover:bg-muted/50",
              )}
            >
              <p className="font-semibold">{option.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{option.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget-amount">
          {budgetType === "DAILY" ? "Daily budget (USD)" : "Lifetime budget (USD)"}
        </Label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="budget-amount"
            type="number"
            min={1}
            step="0.01"
            className="pl-7"
            value={budgetAmountUsd}
            onChange={(e) => setBudgetAmountUsd(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Charged from your lacidaweb wallet after campaign approval.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="schedule-start">Start date (optional)</Label>
          <Input
            id="schedule-start"
            type="datetime-local"
            value={scheduleStart}
            onChange={(e) => setScheduleStart(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="schedule-end">End date (optional)</Label>
          <Input
            id="schedule-end"
            type="datetime-local"
            value={scheduleEnd}
            onChange={(e) => setScheduleEnd(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

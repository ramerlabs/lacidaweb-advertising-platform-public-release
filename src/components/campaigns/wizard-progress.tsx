"use client";

import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "@/lib/campaign-constants";
import type { WizardStep } from "@/stores/campaign-wizard-store";

export function WizardProgress({ currentStep }: { currentStep: WizardStep }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {WIZARD_STEPS.map((item, index) => {
        const done = currentStep > item.step;
        const active = currentStep === item.step;
        return (
          <li key={item.step} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  done || active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {item.step}
              </span>
              <span
                className={cn(
                  "truncate text-xs font-medium sm:text-sm",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </div>
            {index < WIZARD_STEPS.length - 1 ? (
              <div
                className={cn(
                  "hidden h-px flex-1 sm:block",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

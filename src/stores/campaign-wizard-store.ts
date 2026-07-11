import { create } from "zustand";
import type { AdCreativeInput, AudienceTargeting, BudgetType, CampaignObjective } from "@/types/lacidaweb";

export type WizardStep = 1 | 2 | 3 | 4;

const defaultTargeting = (): AudienceTargeting => ({
  demographics: { ageMin: 18, ageMax: 65, genders: ["all"] },
  location: { countries: ["US"] },
  interests: [],
  keywords: [],
});

const defaultAd = (): AdCreativeInput => ({
  name: "Ad 1",
  format: "IMAGE",
  headline: "",
  primaryText: "",
  destinationUrl: "",
  ctaLabel: "Learn More",
  imageUrl: "",
  videoUrl: "",
});

interface CampaignWizardState {
  step: WizardStep;
  name: string;
  objective: CampaignObjective | null;
  targeting: AudienceTargeting;
  budgetType: BudgetType;
  budgetAmountUsd: string;
  scheduleStart: string;
  scheduleEnd: string;
  ads: AdCreativeInput[];
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setName: (name: string) => void;
  setObjective: (objective: CampaignObjective) => void;
  setTargeting: (targeting: AudienceTargeting) => void;
  setBudgetType: (budgetType: BudgetType) => void;
  setBudgetAmountUsd: (amount: string) => void;
  setScheduleStart: (value: string) => void;
  setScheduleEnd: (value: string) => void;
  setAds: (ads: AdCreativeInput[]) => void;
  updateAd: (index: number, patch: Partial<AdCreativeInput>) => void;
  reset: () => void;
}

const initialState = {
  step: 1 as WizardStep,
  name: "",
  objective: null as CampaignObjective | null,
  targeting: defaultTargeting(),
  budgetType: "DAILY" as BudgetType,
  budgetAmountUsd: "25",
  scheduleStart: "",
  scheduleEnd: "",
  ads: [defaultAd()],
};

export const useCampaignWizardStore = create<CampaignWizardState>((set, get) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  nextStep: () => set({ step: Math.min(4, get().step + 1) as WizardStep }),
  prevStep: () => set({ step: Math.max(1, get().step - 1) as WizardStep }),
  setName: (name) => set({ name }),
  setObjective: (objective) => set({ objective }),
  setTargeting: (targeting) => set({ targeting }),
  setBudgetType: (budgetType) => set({ budgetType }),
  setBudgetAmountUsd: (budgetAmountUsd) => set({ budgetAmountUsd }),
  setScheduleStart: (scheduleStart) => set({ scheduleStart }),
  setScheduleEnd: (scheduleEnd) => set({ scheduleEnd }),
  setAds: (ads) => set({ ads }),
  updateAd: (index, patch) =>
    set({
      ads: get().ads.map((ad, i) => (i === index ? { ...ad, ...patch } : ad)),
    }),
  reset: () =>
    set({
      ...initialState,
      targeting: defaultTargeting(),
      ads: [defaultAd()],
    }),
}));

export function validateWizardStep(step: WizardStep, state: CampaignWizardState): string | null {
  if (step === 1) {
    if (!state.name.trim()) return "Enter a campaign name";
    if (!state.objective) return "Select a campaign objective";
    return null;
  }
  if (step === 2) {
    if (!state.targeting.location.countries.length) return "Select at least one country";
    return null;
  }
  if (step === 3) {
    const amount = Number(state.budgetAmountUsd);
    if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid budget amount";
    if (state.scheduleStart && state.scheduleEnd && state.scheduleEnd <= state.scheduleStart) {
      return "End date must be after start date";
    }
    return null;
  }
  if (step === 4) {
    const ad = state.ads[0];
    if (!ad?.name.trim()) return "Enter an ad name";
    if (!ad?.headline.trim()) return "Enter an ad headline";
    if (!ad?.destinationUrl.trim()) return "Enter a destination URL";
    try {
      new URL(ad.destinationUrl);
    } catch {
      return "Enter a valid destination URL";
    }

    if (ad.format === "TEXT_INLINE") {
      if (ad.headline.length > 80) return "Headline must be 80 characters or less for in-line ads";
      return null;
    }

    if (!ad.primaryText.trim()) return "Enter primary text";
    if (ad.primaryText.trim().length < 80) {
      return "Description must be at least 80 characters";
    }

    if (ad.format === "IMAGE" && !ad.imageUrl?.trim()) {
      return "Upload an image for image ads";
    }
    if (ad.format === "VIDEO" && !ad.videoUrl?.trim()) {
      return "Enter a video URL for video ads";
    }
    return null;
  }
  return null;
}

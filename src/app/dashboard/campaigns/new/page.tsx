"use client";

import Link from "next/link";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create campaign</h1>
        <p className="text-sm text-muted-foreground">
          Build your ad in four steps — objective, audience, budget, and creative.
        </p>
      </div>
      <CampaignWizard />
      <p className="text-center text-xs text-muted-foreground">
        Need help?{" "}
        <Link href="/dashboard/support" className="underline underline-offset-2 hover:text-foreground">
          Contact support
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Step = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

export function OnboardingChecklist() {
  const { teamId } = useTeam();
  const [accounts, setAccounts] = useState(0);
  const [posts, setPosts] = useState(0);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    const key = `onboarding-dismissed-${teamId}`;
    setDismissed(localStorage.getItem(key) === "1");

    Promise.all([
      fetch(`/api/accounts?teamId=${teamId}`).then((r) => r.json()),
      fetch(`/api/posts?teamId=${teamId}`).then((r) => r.json()),
      fetch(`/api/ai/generate?teamId=${teamId}`).then((r) => r.json()),
    ]).then(([acc, postData, ai]) => {
      setAccounts((acc.accounts || []).length);
      const list = postData.posts || [];
      setPosts(list.length);
      setScheduled(list.some((p: { status: string }) => p.status === "SCHEDULED"));
      setAiEnabled(Boolean(ai.teamAiEnabled));
    });
  }, [teamId]);

  const steps: Step[] = useMemo(
    () => [
      { id: "account", label: "Connect a social account", href: "/dashboard/accounts", done: accounts > 0 },
      { id: "ai", label: "Enable AI in Settings", href: "/dashboard/settings", done: aiEnabled },
      { id: "compose", label: "Create your first post", href: "/dashboard/compose", done: posts > 0 },
      { id: "schedule", label: "Schedule a post", href: "/dashboard/compose", done: scheduled },
    ],
    [accounts, aiEnabled, posts, scheduled],
  );

  const completed = steps.filter((s) => s.done).length;
  if (dismissed || completed === steps.length) return null;

  function dismiss() {
    if (!teamId) return;
    localStorage.setItem(`onboarding-dismissed-${teamId}`, "1");
    setDismissed(true);
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle>Getting started</CardTitle>
        <CardDescription>
          {completed} of {steps.length} steps complete — finish setup to get the most from your workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => {
          const Icon = step.done ? CheckCircle2 : Circle;
          return (
            <Link
              key={step.id}
              href={step.href}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition hover:bg-accent"
            >
              <Icon className={`h-5 w-5 shrink-0 ${step.done ? "text-primary" : "text-muted-foreground"}`} />
              <span className={step.done ? "text-muted-foreground line-through" : "font-medium"}>{step.label}</span>
            </Link>
          );
        })}
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Dismiss checklist
        </Button>
      </CardContent>
    </Card>
  );
}

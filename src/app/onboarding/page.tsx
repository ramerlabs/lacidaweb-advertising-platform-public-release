"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ClientAccountType } from "@/lib/account-type";
import { getDashboardHome, parseAccountType } from "@/lib/account-type";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { branding } = useSiteBranding();
  const [teamName, setTeamName] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<ClientAccountType>(
    parseAccountType(searchParams.get("type")?.toUpperCase()) || "ADVERTISER",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/onboarding")
      .then(async (res) => {
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          setError(data.error || "Could not load onboarding");
          return;
        }
        if (!data.needsOnboarding) {
          router.replace(getDashboardHome(data.accountType || "ADVERTISER"));
          return;
        }
        setName(data.name || "");
        if (data.accountType) setAccountType(data.accountType);
        if (data.name) {
          setTeamName(`${String(data.name).split(" ")[0]}'s Workspace`);
        }
      })
      .catch(() => {
        setLoading(false);
        setError("Could not load onboarding");
      });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName, accountType }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create workspace");
      return;
    }
    window.location.assign(getDashboardHome(data.accountType || accountType));
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  const isPublisher = accountType === "PUBLISHER";

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome{name ? `, ${name.split(" ")[0]}` : ""}</CardTitle>
          <CardDescription>
            {isPublisher
              ? `Set up your ${branding.title} publisher workspace to register websites and get embed code.`
              : `Name your ${branding.title} advertiser workspace to start running campaigns.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType("ADVERTISER")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  accountType === "ADVERTISER"
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                    : "border-border"
                }`}
              >
                Advertiser
              </button>
              <button
                type="button"
                onClick={() => setAccountType("PUBLISHER")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  accountType === "PUBLISHER"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border"
                }`}
              >
                Publisher
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamName">{isPublisher ? "Website / brand name" : "Team / brand name"}</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={isPublisher ? "e.g. My Blog" : "e.g. Acme Marketing"}
                required
                minLength={2}
              />
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <Button
              className={`w-full ${isPublisher ? "bg-emerald-600 hover:bg-emerald-500" : ""}`}
              disabled={saving}
            >
              {saving ? "Creating workspace..." : "Create workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </main>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

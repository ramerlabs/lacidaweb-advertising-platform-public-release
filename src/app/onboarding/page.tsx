"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { ThemeToggle } from "@/components/theme-toggle";

export default function OnboardingPage() {
  const router = useRouter();
  const { branding } = useSiteBranding();
  const [teamName, setTeamName] = useState("");
  const [name, setName] = useState("");
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
          router.replace("/dashboard");
          return;
        }
        setName(data.name || "");
        if (data.name) {
          setTeamName(`${String(data.name).split(" ")[0]}'s Workspace`);
        }
      })
      .catch(() => {
        setLoading(false);
        setError("Could not load onboarding");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create workspace");
      return;
    }
    window.location.assign("/dashboard");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome{name ? `, ${name.split(" ")[0]}` : ""}</CardTitle>
          <CardDescription>
            One last step — name your {branding.title} workspace so we can set up publishing, inbox, and
            analytics for your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="teamName">Team / brand name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Acme Marketing"
                required
                minLength={2}
              />
              <p className="text-xs text-muted-foreground">
                This becomes your workspace name. You can invite teammates later.
              </p>
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <Button className="w-full" disabled={saving}>
              {saving ? "Creating workspace..." : "Create workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

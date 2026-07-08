"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTeam } from "@/components/dashboard/team-provider";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORMS } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ConnectOption = {
  id: string;
  name: string;
  subtitle?: string;
  raw?: Record<string, unknown>;
};

function SelectAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { teamId } = useTeam();
  const { branding } = useSiteBranding();

  const connectParams = useMemo(() => {
    const resolvedTeamId = searchParams.get("teamId") || teamId || "";
    return {
      teamId: resolvedTeamId,
      profileId: searchParams.get("profileId") || "",
      platform: searchParams.get("platform") || "",
      step: searchParams.get("step") || undefined,
      tempToken: searchParams.get("tempToken") || undefined,
      userProfile: searchParams.get("userProfile") || undefined,
      connect_token: searchParams.get("connect_token") || undefined,
      pendingDataToken: searchParams.get("pendingDataToken") || undefined,
      mode: searchParams.get("mode") || undefined,
      adsPlatform: searchParams.get("adsPlatform") || undefined,
    };
  }, [searchParams, teamId]);

  const [options, setOptions] = useState<ConnectOption[]>([]);
  const [selectionLabel, setSelectionLabel] = useState("Choose an account");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const platformLabel =
    PLATFORMS.find((p) => p.id === connectParams.platform)?.label || connectParams.platform;

  useEffect(() => {
    if (!connectParams.teamId || !connectParams.profileId || !connectParams.platform) {
      setError("Missing connection session — start connect again from Accounts.");
      setLoading(false);
      return;
    }

    const qs = new URLSearchParams();
    Object.entries(connectParams).forEach(([key, value]) => {
      if (value) qs.set(key, value);
    });

    fetch(`/api/accounts/connect/options?${qs.toString()}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load accounts");
        setOptions(data.options || []);
        setSelectionLabel(data.selectionLabel || "Choose an account");
        if (data.options?.[0]?.id) setSelectedId(data.options[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load options"))
      .finally(() => setLoading(false));
  }, [connectParams]);

  async function onConfirm() {
    if (!selectedId) return;
    setSubmitting(true);
    setError("");
    const selected = options.find((o) => o.id === selectedId);
    const res = await fetch("/api/accounts/connect/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...connectParams,
        selectedId,
        selectedRaw: selected?.raw,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Could not finish connecting");
      return;
    }
    router.replace(data.redirectPath || "/dashboard/accounts?connected=1");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Finish connecting {platformLabel}</CardTitle>
          <CardDescription>
            Choose which {branding.title} workspace asset to link to complete the connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your accounts...
            </div>
          ) : null}

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          {!loading && !error ? (
            <>
              <p className="text-sm font-medium">{selectionLabel}</p>
              <div className="space-y-2">
                {options.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No accounts found. Try connecting again.
                  </p>
                ) : (
                  options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedId(option.id)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        selectedId === option.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <p className="font-medium">{option.name}</p>
                      {option.subtitle ? (
                        <p className="text-xs text-muted-foreground">{option.subtitle}</p>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => router.push("/dashboard/accounts")}>
                  Cancel
                </Button>
                <Button disabled={!selectedId || submitting} onClick={onConfirm}>
                  {submitting ? "Connecting..." : "Connect selected"}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SelectAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </div>
      }
    >
      <SelectAccountContent />
    </Suspense>
  );
}

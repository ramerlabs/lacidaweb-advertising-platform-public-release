"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTokenCount } from "@/lib/ai-pricing";
import { toClientFacingMessage } from "@/lib/client-errors";
import { useTeam } from "@/components/dashboard/team-provider";
import { cn } from "@/lib/utils";
import { BusinessProfileGate } from "@/components/campaigns/business-profile-gate";

type AiStatus = {
  aiEnabled: boolean;
  tokenBalance: number;
  pricing?: {
    estimatedTextPostTokens?: number;
    imageTokenCost?: number;
  };
};

type Props = {
  step: "objective" | "audience" | "budget" | "creative";
  title?: string;
  placeholder?: string;
  context?: Record<string, unknown>;
  onApply: (suggestion: Record<string, unknown>) => void;
  allowImage?: boolean;
  onImageGenerated?: (imageUrl: string) => void;
  className?: string;
  requireBusinessProfile?: boolean;
};

export function CampaignAiAssistant({
  step,
  title = "AI assistant",
  placeholder = "Describe what you want…",
  context,
  onApply,
  allowImage,
  onImageGenerated,
  className,
  requireBusinessProfile = step === "creative",
}: Props) {
  const { teamId } = useTeam();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastImagePrompt, setLastImagePrompt] = useState("");
  const [businessReady, setBusinessReady] = useState(!requireBusinessProfile);

  const refresh = useCallback(async () => {
    if (!teamId) return;
    try {
      const res = await fetch(`/api/ai/generate?teamId=${encodeURIComponent(teamId)}`);
      const data = await res.json();
      if (res.ok) {
        setStatus({
          aiEnabled: Boolean(data.aiEnabled),
          tokenBalance: Number(data.tokenBalance) || 0,
          pricing: data.pricing,
        });
      }
    } catch {
      // ignore
    }
  }, [teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const noTokens = (status?.tokenBalance ?? 0) <= 0;
  const platformOff = status != null && !status.aiEnabled;
  const blockedByBusiness = requireBusinessProfile && !businessReady;

  async function runAssist() {
    if (!teamId) return;
    if (blockedByBusiness) {
      setError("Save your business details first so AI can write on-brand ads.");
      return;
    }
    if (noTokens) {
      setError("No AI tokens left. Buy a pack with your wallet or another payment method.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate?action=campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          step,
          prompt: prompt.trim(),
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI assist failed");
      const suggestion = (data.suggestion || {}) as Record<string, unknown>;
      onApply(suggestion);
      if (typeof suggestion.imagePrompt === "string") {
        setLastImagePrompt(suggestion.imagePrompt);
      }
      if (typeof data.tokenBalance === "number") {
        setStatus((s) => (s ? { ...s, tokenBalance: data.tokenBalance } : s));
      } else {
        void refresh();
      }
    } catch (err) {
      setError(toClientFacingMessage(err instanceof Error ? err.message : "AI assist failed"));
    } finally {
      setLoading(false);
    }
  }

  async function runImage() {
    if (!teamId || !onImageGenerated) return;
    if (blockedByBusiness) {
      setError("Save your business details first so AI can generate on-brand images.");
      return;
    }
    if (noTokens) {
      setError("No AI tokens left for image generation.");
      return;
    }
    const imagePrompt =
      lastImagePrompt ||
      prompt.trim() ||
      (typeof context?.name === "string" ? `Ad creative for ${context.name}` : "Modern product advertisement");
    setImageLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate?action=image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, prompt: imagePrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed");
      onImageGenerated(String(data.imageUrl));
      if (typeof data.tokenBalance === "number") {
        setStatus((s) => (s ? { ...s, tokenBalance: data.tokenBalance } : s));
      } else {
        void refresh();
      }
    } catch (err) {
      setError(toClientFacingMessage(err instanceof Error ? err.message : "Image generation failed"));
    } finally {
      setImageLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 dark:bg-cyan-500/10",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">
              Uses gpt-4o-mini for text
              {allowImage ? " · gpt-image-1-mini for images" : ""}. Charged from your AI tokens.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-background/80 px-2.5 py-1.5 text-xs">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium tabular-nums">
            {status ? formatTokenCount(status.tokenBalance) : "…"} tokens
          </span>
        </div>
      </div>

      {requireBusinessProfile ? (
        <div className="mt-3">
          <BusinessProfileGate compact onReady={() => setBusinessReady(true)} />
        </div>
      ) : null}

      {platformOff ? (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
          AI is disabled by the platform admin. Ask them to enable it under Admin → AI & tokens.
        </p>
      ) : null}

      {noTokens && !platformOff ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            You have no AI tokens. Buy a pack with your wallet balance or another payment method.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/billing">Buy AI tokens</Link>
          </Button>
        </div>
      ) : null}

      {!platformOff && !noTokens && !blockedByBusiness ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            disabled={loading || imageLoading}
            className="bg-background"
          />
          <Button
            type="button"
            onClick={() => void runAssist()}
            disabled={loading || imageLoading}
            className="shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generating…" : "Fill with AI"}
          </Button>
          {allowImage && onImageGenerated ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void runImage()}
              disabled={loading || imageLoading}
              className="shrink-0"
            >
              {imageLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {imageLoading ? "Image…" : "Generate image"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

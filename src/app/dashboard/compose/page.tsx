"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import Link from "next/link";

type ConnectedAccount = {
  id: string;
  platform: string;
  username: string | null;
  displayName: string | null;
};

type AiState = {
  aiEnabled: boolean;
  teamAiEnabled: boolean;
  balanceCents: number;
  pricing: {
    estimatedTextPostUsd: number;
    estimatedImageUsd: number;
  };
};

export default function ComposePage() {
  const { teamId } = useTeam();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [tiktokPrivacy, setTiktokPrivacy] = useState("PUBLIC_TO_EVERYONE");
  const [pinterestBoard, setPinterestBoard] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [aiState, setAiState] = useState<AiState | null>(null);
  const [generatingText, setGeneratingText] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/accounts?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []));
    fetch(`/api/ai/generate?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.balanceCents !== undefined) setAiState(data);
      });
  }, [teamId]);

  const selectedAccounts = useMemo(
    () => accounts.filter((a) => selected.includes(a.id)),
    [accounts, selected],
  );

  const selectedPlatforms = useMemo(
    () => new Set(selectedAccounts.map((a) => a.platform)),
    [selectedAccounts],
  );

  const showPlatformOptions =
    selectedPlatforms.has("youtube") ||
    selectedPlatforms.has("tiktok") ||
    selectedPlatforms.has("pinterest");

  useEffect(() => {
    if (accounts.length === 1 && selected.length === 0) {
      setSelected([accounts[0].id]);
    }
  }, [accounts, selected.length]);

  function toggleAccount(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const aiReady = aiState?.aiEnabled && aiState?.teamAiEnabled;

  async function generateText() {
    if (!teamId || !aiPrompt.trim()) return;
    setGeneratingText(true);
    setStatus("");
    const platform = selectedAccounts[0]?.platform;
    const res = await fetch("/api/ai/generate?action=text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, prompt: aiPrompt, platform }),
    });
    const data = await res.json();
    setGeneratingText(false);
    if (!res.ok) {
      setStatus(data.error || "AI text generation failed");
      return;
    }
    setContent(data.text);
    setAiState((s) => (s ? { ...s, balanceCents: data.balanceCents } : s));
    setStatus(`Caption generated ($${(data.chargedCents / 100).toFixed(2)} charged)`);
  }

  async function generateImage() {
    if (!teamId || !imagePrompt.trim()) return;
    setGeneratingImage(true);
    setStatus("");
    const res = await fetch("/api/ai/generate?action=image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, prompt: imagePrompt }),
    });
    const data = await res.json();
    setGeneratingImage(false);
    if (!res.ok) {
      setStatus(data.error || "AI image generation failed");
      return;
    }
    setMediaUrl(data.imageUrl);
    setAiState((s) => (s ? { ...s, balanceCents: data.balanceCents } : s));
    setStatus(`Image generated ($${(data.chargedCents / 100).toFixed(2)} charged)`);
  }

  async function onUpload(file: File) {
    setUploading(true);
    setStatus("");
    try {
      const presign = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream" }),
      });
      const urls = await presign.json();
      if (!presign.ok) throw new Error(urls.error || "Presign failed");

      const put = await fetch(urls.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload to storage failed");

      setMediaUrl(urls.publicUrl);
      setStatus("Media uploaded");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(mode: "draft" | "now" | "schedule") {
    if (!teamId) return;
    setSubmitting(true);
    setStatus("");

    const platformOptions: Record<string, unknown> = {};
    if (selectedAccounts.some((a) => a.platform === "youtube") && youtubeTitle) {
      platformOptions.youtube = { youtubeTitle };
    }
    if (selectedAccounts.some((a) => a.platform === "tiktok")) {
      platformOptions.tiktok = { privacyLevel: tiktokPrivacy };
    }
    if (selectedAccounts.some((a) => a.platform === "pinterest") && pinterestBoard) {
      platformOptions.pinterest = { boardId: pinterestBoard };
    }

    const payload = {
      teamId,
      content,
      mediaUrls: mediaUrl ? [mediaUrl] : [],
      connectedAccountIds: selected,
      draft: mode === "draft",
      publishNow: mode === "now",
      scheduledFor: mode === "schedule" ? new Date(scheduledFor).toISOString() : null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platformOptions,
    };

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setStatus(data.error || "Failed to create post");
      return;
    }

    setStatus(`Post ${data.post.status}`);
    if (mode !== "draft") {
      setContent("");
      setMediaUrl("");
      setSelected([]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compose</h1>
        <p className="text-muted-foreground">
          Multi-channel publisher with media uploads and platform-specific options
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Post content</CardTitle>
            <CardDescription>
              Supports images and videos using secure uploads (up to platform limits)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Caption</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your marketing copy..."
              />
            </div>

            {aiState?.aiEnabled ? (
              <Card className="border-dashed bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4" />
                    AI assistant
                  </CardTitle>
                  <CardDescription>
                    {aiReady ? (
                      <>
                        Balance: <strong>${(aiState.balanceCents / 100).toFixed(2)}</strong> · Est. caption ~$
                        {aiState.pricing.estimatedTextPostUsd.toFixed(3)} · image ~$
                        {aiState.pricing.estimatedImageUsd.toFixed(2)}
                      </>
                    ) : (
                      <>
                        Enable AI in{" "}
                        <Link href="/dashboard/settings" className="text-primary underline">
                          Settings
                        </Link>{" "}
                        to use generation.
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="ai-prompt">Generate caption</Label>
                    <Textarea
                      id="ai-prompt"
                      rows={2}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g. Promote our new digital banking app for small businesses..."
                      disabled={!aiReady}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!aiReady || generatingText || !aiPrompt.trim()}
                      onClick={generateText}
                    >
                      {generatingText ? "Generating..." : "Generate text"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-image">Generate image</Label>
                    <Textarea
                      id="ai-image"
                      rows={2}
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="e.g. Modern fintech app on a phone, purple gradient, professional..."
                      disabled={!aiReady}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!aiReady || generatingImage || !imagePrompt.trim()}
                      onClick={generateImage}
                    >
                      {generatingImage ? "Generating..." : "Generate image"}
                    </Button>
                  </div>
                  {!aiReady ? (
                    <p className="text-xs text-muted-foreground">
                      <Link href="/dashboard/billing" className="text-primary underline">
                        Buy AI credits
                      </Link>{" "}
                      in Billing when your balance runs low.
                    </p>
                  ) : aiState.balanceCents < 50 ? (
                    <p className="text-xs text-amber-700">
                      Low balance.{" "}
                      <Link href="/dashboard/billing" className="underline">
                        Buy AI credits
                      </Link>
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="media">Media file</Label>
              <Input
                id="media"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                }}
              />
              {uploading ? <p className="text-sm text-muted-foreground">Uploading...</p> : null}
              {mediaUrl ? (
                <p className="break-all text-xs text-emerald-700">Uploaded: {mediaUrl}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule (optional)</Label>
              <Input
                id="schedule"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {showPlatformOptions ? (
                <>
                  {selectedPlatforms.has("youtube") ? (
                    <div className="space-y-2">
                      <Label htmlFor="yt">YouTube title</Label>
                      <Input
                        id="yt"
                        value={youtubeTitle}
                        onChange={(e) => setYoutubeTitle(e.target.value)}
                      />
                    </div>
                  ) : null}
                  {selectedPlatforms.has("tiktok") ? (
                    <div className="space-y-2">
                      <Label htmlFor="tt">TikTok privacy</Label>
                      <select
                        id="tt"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={tiktokPrivacy}
                        onChange={(e) => setTiktokPrivacy(e.target.value)}
                      >
                        <option value="PUBLIC_TO_EVERYONE">Public</option>
                        <option value="MUTUAL_FOLLOW_FRIENDS">Friends</option>
                        <option value="SELF_ONLY">Private</option>
                      </select>
                    </div>
                  ) : null}
                  {selectedPlatforms.has("pinterest") ? (
                    <div className="space-y-2">
                      <Label htmlFor="pin">Pinterest board ID</Label>
                      <Input
                        id="pin"
                        value={pinterestBoard}
                        onChange={(e) => setPinterestBoard(e.target.value)}
                        placeholder="Required for Pinterest pins"
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground md:col-span-3">
                  Select a channel on the right to see platform-specific options.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={submitting} onClick={() => submit("now")}>
                Publish now
              </Button>
              <Button
                variant="secondary"
                disabled={submitting || !scheduledFor}
                onClick={() => submit("schedule")}
              >
                Schedule
              </Button>
              <Button variant="outline" disabled={submitting} onClick={() => submit("draft")}>
                Save draft
              </Button>
            </div>
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channels</CardTitle>
            <CardDescription>Select connected accounts to target</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Connect accounts first.</p>
            ) : (
              accounts.map((account) => {
                const active = selected.includes(account.id);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => toggleAccount(account.id)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${
                      active ? "border-primary bg-accent" : "hover:bg-secondary"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{account.displayName || account.username}</div>
                      <div className="text-xs text-muted-foreground">@{account.username || "unknown"}</div>
                    </div>
                    <Badge variant={active ? "default" : "outline"}>{account.platform}</Badge>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

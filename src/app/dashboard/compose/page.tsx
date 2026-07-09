"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CalendarClock, Trash2 } from "lucide-react";
import Link from "next/link";

type ConnectedAccount = {
  id: string;
  platform: string;
  username: string | null;
  displayName: string | null;
};

type QueuePost = {
  id: string;
  content: string;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  mediaUrls: string[];
  targets: Array<{
    platform: string;
    connectedAccount: {
      displayName: string | null;
      username: string | null;
    };
  }>;
};

type AiState = {
  aiEnabled: boolean;
  teamAiEnabled: boolean;
  tokenBalance: number;
  businessProfileComplete?: boolean;
  pricing: {
    estimatedTextPostUsd: number;
    estimatedImageUsd: number;
    estimatedTextPostTokens: number;
    imageTokenCost: number;
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
  const [aiTone, setAiTone] = useState("professional");
  const [transforming, setTransforming] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; prompt: string; tone: string | null }>>([]);
  const [templateName, setTemplateName] = useState("");
  const [queuePosts, setQueuePosts] = useState<QueuePost[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function loadQueue() {
    if (!teamId) return;
    setLoadingQueue(true);
    const res = await fetch(`/api/posts?teamId=${teamId}`);
    const data = await res.json();
    setQueuePosts(data.posts || []);
    setLoadingQueue(false);
  }

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/accounts?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []));
    fetch(`/api/ai/generate?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tokenBalance !== undefined) setAiState(data);
      });
    fetch(`/api/post-templates?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []));
    void loadQueue();
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

  const upcomingPosts = useMemo(
    () =>
      queuePosts
        .filter((p) => ["SCHEDULED", "DRAFT", "PENDING"].includes(p.status))
        .sort((a, b) => {
          const aTime = a.scheduledFor ? new Date(a.scheduledFor).getTime() : new Date(a.createdAt).getTime();
          const bTime = b.scheduledFor ? new Date(b.scheduledFor).getTime() : new Date(b.createdAt).getTime();
          return aTime - bTime;
        }),
    [queuePosts],
  );

  function formatPostWhen(post: QueuePost) {
    if (post.scheduledFor) {
      return new Date(post.scheduledFor).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
    return `Created ${new Date(post.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
  }

  function statusBadgeVariant(status: string): "default" | "secondary" | "outline" {
    if (status === "SCHEDULED") return "default";
    if (status === "PENDING") return "secondary";
    return "outline";
  }

  async function cancelQueuedPost(postId: string) {
    if (!teamId) return;
    if (!window.confirm("Cancel this post? It will be removed from your queue.")) return;
    setCancellingId(postId);
    const res = await fetch(`/api/posts/${postId}?teamId=${teamId}`, { method: "DELETE" });
    const data = await res.json();
    setCancellingId(null);
    if (!res.ok) {
      setStatus(data.error || "Could not cancel post");
      return;
    }
    setQueuePosts((prev) => prev.filter((p) => p.id !== postId));
    setStatus("Post cancelled");
  }

  useEffect(() => {
    if (accounts.length === 1 && selected.length === 0) {
      setSelected([accounts[0].id]);
    }
  }, [accounts, selected.length]);

  function toggleAccount(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const aiReady = aiState?.aiEnabled && aiState?.teamAiEnabled;

  function confirmTokenSpend(label: string, estimatedTokens: number): boolean {
    if (!aiState) return false;
    return window.confirm(
      `${label} uses approximately ${estimatedTokens.toLocaleString()} tokens.\n\nYour balance: ${aiState.tokenBalance.toLocaleString()} tokens.\n\nContinue?`,
    );
  }

  function resolveTextPromptForRequest(): string {
    return aiPrompt.trim() || content.trim();
  }

  function resolveImagePromptForRequest(): string {
    return imagePrompt.trim() || aiPrompt.trim() || content.trim();
  }

  async function generateText() {
    if (!teamId || !aiReady) return;
    if (!confirmTokenSpend("Generate caption", aiState!.pricing.estimatedTextPostTokens)) return;
    setGeneratingText(true);
    setStatus("");
    const platform = selectedAccounts[0]?.platform;
    const res = await fetch("/api/ai/generate?action=text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, prompt: resolveTextPromptForRequest(), platform, tone: aiTone }),
    });
    const data = await res.json();
    setGeneratingText(false);
    if (!res.ok) {
      setStatus(data.error || "AI text generation failed");
      return;
    }
    setContent(data.text);
    setAiState((s) => (s ? { ...s, tokenBalance: data.tokenBalance } : s));
    setStatus(`Caption generated (${data.tokensUsed?.toLocaleString() || 0} tokens used)`);
  }

  async function generateImage() {
    if (!teamId || !aiReady) return;
    if (!confirmTokenSpend("Generate image", aiState!.pricing.imageTokenCost)) return;
    setGeneratingImage(true);
    setStatus("");
    const res = await fetch("/api/ai/generate?action=image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, prompt: resolveImagePromptForRequest() }),
    });
    const data = await res.json();
    setGeneratingImage(false);
    if (!res.ok) {
      setStatus(data.error || "AI image generation failed");
      return;
    }
    setMediaUrl(data.imageUrl);
    setAiState((s) => (s ? { ...s, tokenBalance: data.tokenBalance } : s));
    setStatus(`Image generated (${data.tokensUsed?.toLocaleString() || 0} tokens used)`);
  }

  async function transformContent(mode: "shorten" | "hashtags" | "regenerate") {
    if (!teamId || !content.trim() || !aiReady) return;
    if (!confirmTokenSpend(`${mode} caption`, aiState!.pricing.estimatedTextPostTokens)) return;
    setTransforming(true);
    setStatus("");
    const res = await fetch("/api/ai/generate?action=transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, content, mode, tone: aiTone }),
    });
    const data = await res.json();
    setTransforming(false);
    if (!res.ok) {
      setStatus(data.error || "AI transform failed");
      return;
    }
    setContent(data.text);
    setAiState((s) => (s ? { ...s, tokenBalance: data.tokenBalance } : s));
    setStatus(`${mode} applied (${data.tokensUsed?.toLocaleString() || 0} tokens)`);
  }

  async function saveTemplate() {
    if (!teamId || !templateName.trim() || !aiPrompt.trim()) return;
    const res = await fetch("/api/post-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, name: templateName, prompt: aiPrompt, tone: aiTone }),
    });
    const data = await res.json();
    if (res.ok) {
      setTemplates((t) => [data.template, ...t]);
      setTemplateName("");
      setStatus("Template saved");
    }
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
    await loadQueue();
    if (mode !== "draft") {
      setContent("");
      setMediaUrl("");
      setSelected([]);
      setScheduledFor("");
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
              {content && aiReady ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={transforming} onClick={() => transformContent("shorten")}>
                    Shorten
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={transforming} onClick={() => transformContent("hashtags")}>
                    Add hashtags
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={transforming} onClick={() => transformContent("regenerate")}>
                    Regenerate
                  </Button>
                </div>
              ) : null}
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
                        Balance: <strong>{aiState.tokenBalance.toLocaleString()} tokens</strong> · Est.
                        caption ~{aiState.pricing.estimatedTextPostTokens} tokens · image ~{" "}
                        {aiState.pricing.imageTokenCost.toLocaleString()} tokens
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
                {aiReady && aiState.businessProfileComplete === false ? (
                  <div className="mx-6 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    Add your{" "}
                    <Link href="/dashboard/settings" className="font-medium underline">
                      business profile
                    </Link>{" "}
                    in Settings so AI knows your brand, audience, and offers.
                  </div>
                ) : null}
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="ai-tone">Tone</Label>
                    <select
                      id="ai-tone"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      disabled={!aiReady}
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="promotional">Promotional</option>
                      <option value="educational">Educational</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-prompt">Generate caption (optional)</Label>
                    <Textarea
                      id="ai-prompt"
                      rows={2}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Optional — leave blank to use your caption or business profile"
                      disabled={!aiReady}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!aiReady || generatingText}
                      onClick={generateText}
                    >
                      {generatingText ? "Generating..." : "Generate text"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-image">Generate image (optional)</Label>
                    <Textarea
                      id="ai-image"
                      rows={2}
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Optional — leave blank to match your caption or brand"
                      disabled={!aiReady}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!aiReady || generatingImage}
                      onClick={generateImage}
                    >
                      {generatingImage ? "Generating..." : "Generate image"}
                    </Button>
                  </div>
                  {templates.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Saved templates</Label>
                      <div className="flex flex-wrap gap-2">
                        {templates.map((t) => (
                          <Button
                            key={t.id}
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!aiReady}
                            onClick={() => {
                              setAiPrompt(t.prompt);
                              if (t.tone) setAiTone(t.tone);
                            }}
                          >
                            {t.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Template name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      disabled={!aiReady}
                    />
                    <Button type="button" size="sm" variant="outline" disabled={!aiReady || !aiPrompt.trim()} onClick={saveTemplate}>
                      Save template
                    </Button>
                  </div>
                  {!aiReady ? (
                    <p className="text-xs text-muted-foreground">
                      <Link href="/dashboard/billing" className="text-primary underline">
                        Buy AI tokens
                      </Link>{" "}
                      in Billing when your balance runs low.
                    </p>
                  ) : aiState.tokenBalance < 500 ? (
                    <p className="text-xs text-amber-700">
                      Low balance.{" "}
                      <Link href="/dashboard/billing" className="underline">
                        Buy AI tokens
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
                <div className="space-y-2">
                  {mediaUrl.match(/\.(png|jpe?g|gif|webp)(\?|$)/i) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl} alt="Uploaded media" className="max-h-48 rounded-lg border object-contain" />
                  ) : null}
                  <p className="break-all text-xs text-emerald-700">Uploaded: {mediaUrl}</p>
                </div>
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

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Scheduled &amp; drafts
            </CardTitle>
            <CardDescription>
              Upcoming posts queued for publishing — manage them here or view the full{" "}
              <Link href="/dashboard/calendar" className="text-primary underline">
                calendar
              </Link>
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadQueue()} disabled={loadingQueue}>
            {loadingQueue ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scheduled posts yet. Pick channels, set a date and time above, then click{" "}
              <strong>Schedule</strong>.
            </p>
          ) : (
            upcomingPosts.map((post) => (
              <div
                key={post.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusBadgeVariant(post.status)}>{post.status}</Badge>
                    <span className="text-sm text-muted-foreground">{formatPostWhen(post)}</span>
                  </div>
                  <p className="text-sm">
                    {post.content.trim()
                      ? post.content.length > 160
                        ? `${post.content.slice(0, 160)}…`
                        : post.content
                      : <span className="text-muted-foreground italic">No caption — media only</span>}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {post.targets.map((t, i) => (
                      <Badge key={`${post.id}-${i}`} variant="outline" className="text-xs">
                        {t.connectedAccount.displayName || t.connectedAccount.username || t.platform}
                        {" · "}
                        {t.platform}
                      </Badge>
                    ))}
                  </div>
                  {post.mediaUrls.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {post.mediaUrls.length} media file{post.mediaUrls.length === 1 ? "" : "s"} attached
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-rose-600 hover:text-rose-700"
                  disabled={cancellingId === post.id}
                  onClick={() => cancelQueuedPost(post.id)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  {cancellingId === post.id ? "Cancelling..." : "Cancel"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

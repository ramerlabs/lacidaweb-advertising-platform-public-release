"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type ConnectedAccount = {
  id: string;
  platform: string;
  username: string | null;
  displayName: string | null;
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

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/accounts?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []));
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

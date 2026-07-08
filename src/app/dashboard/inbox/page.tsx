"use client";

import { useEffect, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type InboxItem = {
  id: string;
  type: "COMMENT" | "MESSAGE";
  status: string;
  platform: string;
  authorName: string | null;
  authorHandle: string | null;
  content: string;
  autoReplied: boolean;
  receivedAt: string;
};

export default function InboxPage() {
  const { teamId } = useTeam();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | "COMMENT" | "MESSAGE">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function load(sync = false) {
    if (!teamId) return;
    if (sync) setSyncing(true);
    const qs = filter === "ALL" ? "" : `&type=${filter}`;
    const syncQs = sync ? "&sync=1" : "";
    const res = await fetch(`/api/inbox?teamId=${teamId}${qs}${syncQs}`);
    const data = await res.json();
    if (sync) setSyncing(false);
    if (!res.ok) {
      setStatus(data.error || "Could not load inbox");
      return;
    }
    setItems(data.items || []);
    if (sync && data.sync) {
      if (data.sync.error) {
        setStatus(data.sync.error);
      } else {
        const parts: string[] = [];
        if (data.sync.synced > 0) parts.push(`${data.sync.synced} comment(s)`);
        if (data.sync.syncedMessages > 0) parts.push(`${data.sync.syncedMessages} message(s)`);
        if (parts.length > 0) {
          setStatus(`Synced ${parts.join(" and ")} from your connected accounts.`);
        } else {
          setStatus("Sync complete — no new comments or messages found.");
        }
      }
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, filter]);

  const selected = items.find((i) => i.id === selectedId) || null;

  async function sendReply() {
    if (!teamId || !selected) return;
    setStatus("");
    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, inboxItemId: selected.id, text: reply }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Reply failed");
      return;
    }
    setReply("");
    setStatus("Reply sent");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Unified inbox</h1>
        <p className="text-muted-foreground">Comments and DMs streamed from your connected channels</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "COMMENT", "MESSAGE"] as const).map((value) => (
          <Button
            key={value}
            variant={filter === value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(value)}
          >
            {value}
          </Button>
        ))}
        <Button variant="outline" size="sm" disabled={syncing} onClick={() => void load(true)}>
          {syncing ? "Syncing..." : "Sync now"}
        </Button>
      </div>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Incoming</CardTitle>
            <CardDescription>{items.length} recent items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No inbox events yet. Click <strong>Sync now</strong> to pull recent comments and DMs from
                Facebook and other connected accounts, or wait for new activity via webhook.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-lg border p-3 text-left ${
                    selectedId === item.id ? "border-primary bg-accent" : "hover:bg-secondary"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary">{item.platform}</Badge>
                    <Badge variant="outline">{item.type}</Badge>
                    {item.autoReplied ? <Badge variant="success">auto-replied</Badge> : null}
                    <Badge
                      variant={
                        item.status === "UNREAD" ? "warning" : item.status === "REPLIED" ? "success" : "secondary"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">{item.authorName || item.authorHandle || "Unknown"}</div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reply</CardTitle>
            <CardDescription>Send replies to comments and direct messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <div className="rounded-lg border bg-secondary/40 p-3 text-sm">{selected.content}</div>
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply..."
                />
                <Button onClick={sendReply} disabled={!reply.trim()}>
                  Send reply
                </Button>
                {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select an inbox item to reply.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Rule = {
  id: string;
  name: string;
  keywords: string[];
  matchMode: string;
  replyType: string;
  replyTemplate: string;
  platforms: string[];
  isActive: boolean;
};

export default function AutomationsPage() {
  const { teamId } = useTeam();
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState({
    name: "Brand keyword DM",
    keywords: "price,demo,partnership",
    matchMode: "any",
    replyType: "dm",
    replyTemplate: "Thanks for your interest! We'll message you shortly.",
    platforms: "instagram,facebook",
  });
  const [status, setStatus] = useState("");

  async function load() {
    if (!teamId) return;
    // reuse inbox PUT creation; list via dedicated fetch of rules using prisma through a lightweight endpoint pattern
    const res = await fetch(`/api/automations?teamId=${teamId}`);
    if (res.ok) {
      const data = await res.json();
      setRules(data.rules || []);
    }
  }

  useEffect(() => {
    load();
  }, [teamId]);

  async function createRule() {
    if (!teamId) return;
    setStatus("");
    const res = await fetch("/api/inbox", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        name: form.name,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        matchMode: form.matchMode,
        replyType: form.replyType,
        replyTemplate: form.replyTemplate,
        platforms: form.platforms.split(",").map((p) => p.trim()).filter(Boolean),
        isActive: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Failed to create rule");
      return;
    }
    setStatus("Automation created");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
        <p className="text-muted-foreground">Keyword-based comment auto-replies and private DMs</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create rule</CardTitle>
            <CardDescription>
              If an incoming comment matches brand keywords, trigger a reply or DM
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Keywords (comma-separated)</Label>
              <Input
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Match mode</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.matchMode}
                  onChange={(e) => setForm({ ...form, matchMode: e.target.value })}
                >
                  <option value="any">Any keyword</option>
                  <option value="all">All keywords</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Reply type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.replyType}
                  onChange={(e) => setForm({ ...form, replyType: e.target.value })}
                >
                  <option value="comment">Public comment reply</option>
                  <option value="dm">Private DM / reply</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Platforms (comma-separated, blank = all)</Label>
              <Input
                value={form.platforms}
                onChange={(e) => setForm({ ...form, platforms: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reply template</Label>
              <Textarea
                value={form.replyTemplate}
                onChange={(e) => setForm({ ...form, replyTemplate: e.target.value })}
              />
            </div>
            <Button onClick={createRule}>Save automation</Button>
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No automations yet.</p>
            ) : (
              rules.map((rule) => (
                <div key={rule.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{rule.name}</div>
                    <Badge variant={rule.isActive ? "success" : "secondary"}>
                      {rule.isActive ? "active" : "off"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {rule.matchMode} of [{rule.keywords.join(", ")}] → {rule.replyType}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

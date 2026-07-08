"use client";

import { useEffect, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { PLATFORMS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ConnectedAccount = {
  id: string;
  platform: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export default function AccountsPage() {
  const { teamId } = useTeam();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load(sync = false) {
    if (!teamId) return;
    setLoading(true);
    const res = await fetch(`/api/accounts?teamId=${teamId}${sync ? "&sync=1" : ""}`);
    const data = await res.json();
    setAccounts(data.accounts || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function connect(platform: string) {
    if (!teamId) return;
    setMessage("");
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, platform }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed to start OAuth");
      return;
    }
    window.location.href = data.authUrl;
  }

  async function disconnect(accountId: string) {
    if (!teamId) return;
    await fetch(`/api/accounts?teamId=${teamId}&accountId=${accountId}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connected accounts</h1>
          <p className="text-muted-foreground">Secure channel authorization across 15+ platforms</p>
        </div>
        <Button variant="outline" onClick={() => load(true)} disabled={loading}>
          Sync channels
        </Button>
      </div>

      {message ? <p className="text-sm text-rose-600">{message}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Active connections</CardTitle>
          <CardDescription>Linked to this team workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
          ) : (
            accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">
                    {account.displayName || account.username || account.platform}
                  </div>
                  <div className="text-sm text-muted-foreground">@{account.username || "unknown"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{account.platform}</Badge>
                  <Button variant="outline" size="sm" onClick={() => disconnect(account.id)}>
                    Disconnect
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect a channel</CardTitle>
          <CardDescription>Starts secure OAuth and returns to your workspace</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((platform) => (
            <Button key={platform.id} variant="outline" onClick={() => connect(platform.id)}>
              Connect {platform.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

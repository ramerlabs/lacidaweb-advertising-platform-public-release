"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { plans } from "@/lib/pricing";

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  bannedAt: string | null;
  banReason: string | null;
  createdAt: string;
  team: {
    id: string;
    name: string;
    slug: string;
    aiBalanceCents: number;
    connectedAccounts: number;
    posts: number;
  } | null;
  subscription: {
    id: string;
    planId: string;
    status: string;
    accountLimit: number;
    amount: number;
    interval: string;
    currentPeriodEnd: string | null;
  } | null;
};

type Tab = "all" | "banned";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [bannedUsers, setBannedUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [unbanningId, setUnbanningId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState("growth");
  const [subscriptionStatus, setSubscriptionStatus] = useState("TRIAL");
  const [interval, setIntervalBilling] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [newPassword, setNewPassword] = useState("");
  const [sendPasswordEmail, setSendPasswordEmail] = useState(true);
  const [banReason, setBanReason] = useState("");
  const [aiBalance, setAiBalance] = useState("");
  const [addAiCredits, setAddAiCredits] = useState("");

  const selected = useMemo(
    () => users.find((u) => u.id === selectedId) || bannedUsers.find((u) => u.id === selectedId) || null,
    [users, bannedUsers, selectedId],
  );

  async function loadAll(search = q) {
    const res = await fetch(`/api/admin/users${search ? `?q=${encodeURIComponent(search)}` : ""}`);
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Failed to load users");
      return;
    }
    setUsers(data.users || []);
  }

  async function loadBanned(search = q) {
    const params = new URLSearchParams({ banned: "1" });
    if (search) params.set("q", search);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Failed to load banned users");
      return;
    }
    setBannedUsers(data.users || []);
  }

  async function refresh() {
    setLoading(true);
    await Promise.all([loadAll(q), loadBanned(q)]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // intentionally load once on mount; search uses the Search button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    setName(selected.name || "");
    setEmail(selected.email);
    setPlanId(selected.subscription?.planId || "growth");
    setSubscriptionStatus(selected.subscription?.status || "TRIAL");
    setIntervalBilling((selected.subscription?.interval as "MONTHLY" | "YEARLY") || "MONTHLY");
    setBanReason(selected.banReason || "");
    setNewPassword("");
    setAiBalance(
      selected.team?.aiBalanceCents !== undefined
        ? (selected.team.aiBalanceCents / 100).toFixed(2)
        : "0.00",
    );
    setAddAiCredits("");
  }, [selected]);

  async function save(patch: Record<string, unknown>, userId = selectedId) {
    if (!userId) return;
    setSaving(true);
    setStatus("");
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error || "Update failed");
      return;
    }
    if (data.newPassword) {
      setStatus(`${data.message} New password: ${data.newPassword}`);
    } else {
      setStatus(data.message || "Updated");
    }
    setNewPassword("");
    await refresh();
  }

  async function quickUnban(userId: string) {
    setUnbanningId(userId);
    setStatus("");
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: false, banReason: null }),
    });
    const data = await res.json();
    setUnbanningId(null);
    if (!res.ok) {
      setStatus(data.error || "Unban failed");
      return;
    }
    setStatus("User unbanned");
    if (selectedId === userId) setSelectedId(null);
    await refresh();
  }

  async function saveAiCredits() {
    const balance = Number(aiBalance);
    const add = Number(addAiCredits);
    if (!Number.isNaN(balance) && aiBalance.trim() !== "") {
      await save({ aiBalanceCents: Math.round(balance * 100) });
      return;
    }
    if (!Number.isNaN(add) && add > 0) {
      await save({ addAiCreditsCents: Math.round(add * 100) });
    }
  }

  async function saveProfile() {
    await save({ name, email, planId, subscriptionStatus, interval });
  }

  async function changePassword() {
    await save({
      newPassword: newPassword.trim() || undefined,
      sendPasswordEmail,
    });
  }

  async function toggleBan(banned: boolean) {
    await save({
      banned,
      banReason: banned ? banReason.trim() || "Banned by admin" : null,
    });
  }

  const list = tab === "banned" ? bannedUsers : users;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          View clients, edit profiles, manage plans, reset passwords, and ban access.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={tab === "all" ? "default" : "outline"} onClick={() => setTab("all")}>
          All users ({users.length})
        </Button>
        <Button variant={tab === "banned" ? "default" : "outline"} onClick={() => setTab("banned")}>
          Banned ({bannedUsers.length})
        </Button>
        <Input
          className="max-w-sm"
          placeholder="Search by name or email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") refresh();
          }}
        />
        <Button variant="outline" onClick={() => refresh()}>
          Search
        </Button>
      </div>

      {tab === "banned" ? (
        <Card>
          <CardHeader>
            <CardTitle>Banned users</CardTitle>
            <CardDescription>Review ban reasons and restore access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : bannedUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No banned users.</p>
            ) : (
              bannedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50/50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-rose-900 dark:bg-rose-950/20"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name || "Unnamed"}</p>
                      <Badge variant="danger">Banned</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
                      <span className="font-medium">Reason:</span> {user.banReason || "No reason provided"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Banned {user.bannedAt ? new Date(user.bannedAt).toLocaleString() : "—"} · Team:{" "}
                      {user.team?.name || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedId(user.id);
                        setTab("all");
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      disabled={unbanningId === user.id}
                      onClick={() => quickUnban(user.id)}
                    >
                      {unbanningId === user.id ? "Unbanning..." : "Unban"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className={`grid gap-6 ${tab === "all" ? "lg:grid-cols-[1.1fr_1fr]" : ""}`}>
        {tab === "all" ? (
          <Card>
            <CardHeader>
              <CardTitle>All users</CardTitle>
              <CardDescription>{users.length} accounts</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[70vh] space-y-2 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : list.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users found.</p>
              ) : (
                list.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedId(user.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedId === user.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{user.name || "Unnamed"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {user.team?.name || "No team"} · {user.subscription?.planId || "no plan"} ·{" "}
                          {user.subscription?.status || "free"}
                        </p>
                        {user.bannedAt && user.banReason ? (
                          <p className="mt-1 text-xs text-rose-600">Reason: {user.banReason}</p>
                        ) : null}
                      </div>
                      {user.bannedAt ? <Badge variant="danger">Banned</Badge> : null}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}

        {tab === "all" ? (
          <div className="space-y-4">
            {!selected ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Select a user to manage
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Profile & plan</CardTitle>
                    <CardDescription>
                      Team: {selected.team?.name || "—"} · Accounts:{" "}
                      {selected.team?.connectedAccounts ?? 0} · Posts: {selected.team?.posts ?? 0}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Plan</Label>
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={planId}
                          onChange={(e) => setPlanId(e.target.value)}
                        >
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name} (${plan.monthlyPrice}/mo)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={subscriptionStatus}
                          onChange={(e) => setSubscriptionStatus(e.target.value)}
                        >
                          <option value="TRIAL">TRIAL (free access)</option>
                          <option value="ACTIVE">ACTIVE (paid)</option>
                          <option value="PAST_DUE">PAST_DUE</option>
                          <option value="CANCELED">CANCELED</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Billing interval</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={interval}
                        onChange={(e) => setIntervalBilling(e.target.value as "MONTHLY" | "YEARLY")}
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>
                    <Button onClick={saveProfile} disabled={saving}>
                      {saving ? "Saving..." : "Save profile & plan"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>AI credits</CardTitle>
                    <CardDescription>
                      Manually set or add AI token balance for this client&apos;s workspace
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">
                      Current balance:{" "}
                      <strong>
                        ${((selected.team?.aiBalanceCents || 0) / 100).toFixed(2)}
                      </strong>
                    </p>
                    <div className="space-y-2">
                      <Label>Set balance (USD)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={aiBalance}
                        onChange={(e) => setAiBalance(e.target.value)}
                        placeholder="e.g. 10.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Replaces the current balance with this exact amount.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Or add credits (USD)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={addAiCredits}
                        onChange={(e) => setAddAiCredits(e.target.value)}
                        placeholder="e.g. 5.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Adds to the current balance instead of replacing it.
                      </p>
                    </div>
                    <Button variant="outline" onClick={saveAiCredits} disabled={saving}>
                      {saving ? "Saving..." : "Update AI credits"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Change password</CardTitle>
                    <CardDescription>Set a new password for this client</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>New password (optional)</Label>
                      <Input
                        type="password"
                        placeholder="Leave blank to auto-generate"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={sendPasswordEmail}
                        onChange={(e) => setSendPasswordEmail(e.target.checked)}
                      />
                      Email new password to user
                    </label>
                    <Button variant="outline" onClick={changePassword} disabled={saving}>
                      Update password
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ban access</CardTitle>
                    <CardDescription>Banned users cannot sign in or use the dashboard.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selected.bannedAt ? (
                      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm dark:border-rose-900 dark:bg-rose-950/30">
                        <p className="text-rose-700 dark:text-rose-300">
                          Banned {new Date(selected.bannedAt).toLocaleString()}
                        </p>
                        <p className="mt-1 text-rose-800 dark:text-rose-200">
                          <span className="font-medium">Reason:</span>{" "}
                          {selected.banReason || "No reason provided"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Ban reason</Label>
                        <Input
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          placeholder="Shown to the user on login"
                        />
                      </div>
                    )}
                    {selected.bannedAt ? (
                      <Button variant="outline" onClick={() => toggleBan(false)} disabled={saving}>
                        Unban user
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="border-rose-300 text-rose-700"
                        onClick={() => toggleBan(true)}
                        disabled={saving}
                      >
                        Ban user
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        ) : null}
      </div>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}

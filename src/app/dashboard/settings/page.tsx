"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ThemeSelect } from "@/components/theme-toggle";

export default function SettingsPage() {
  const { teamId, teams } = useTeam();
  const team = useMemo(() => teams.find((t) => t.id === teamId), [teams, teamId]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [changing, setChanging] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiBalanceCents, setAiBalanceCents] = useState(0);
  const [platformAiEnabled, setPlatformAiEnabled] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState("");

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/ai/generate?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.teamAiEnabled !== undefined) setAiEnabled(data.teamAiEnabled);
        if (data.balanceCents !== undefined) setAiBalanceCents(data.balanceCents);
        if (data.aiEnabled !== undefined) setPlatformAiEnabled(data.aiEnabled);
      });
  }, [teamId]);

  async function toggleAi(enabled: boolean) {
    if (!teamId) return;
    setAiSaving(true);
    setAiStatus("");
    const res = await fetch("/api/teams/ai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, aiEnabled: enabled }),
    });
    const data = await res.json();
    setAiSaving(false);
    if (!res.ok) {
      setAiStatus(data.error || "Failed to update AI setting");
      return;
    }
    setAiEnabled(data.team.aiEnabled);
    setAiStatus(enabled ? "AI enabled for this workspace" : "AI disabled");
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      setPasswordStatus("Enter current and new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("New passwords do not match");
      return;
    }

    setChanging(true);
    setPasswordStatus("");
    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setChanging(false);

    if (!res.ok) {
      setPasswordStatus(data.error || "Password change failed");
      return;
    }

    setPasswordStatus(data.message || "Password updated");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Workspace, appearance, and account security</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Multi-tenant team and private integration profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Team name</Label>
            <Input value={team?.name || ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Team slug</Label>
            <Input value={team?.slug || ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Internal profile ID</Label>
            <Input value={team?.zernioProfileId || "Provisioning on first connect..."} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose light or dark theme for your dashboard</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Theme preference is saved on this device.</p>
          <ThemeSelect />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI generation</CardTitle>
          <CardDescription>
            Allow AI to auto-generate post captions and images using your credit balance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!platformAiEnabled ? (
            <p className="text-sm text-muted-foreground">AI is not enabled on this platform yet.</p>
          ) : (
            <>
              <p className="text-sm">
                Credit balance: <strong>${(aiBalanceCents / 100).toFixed(2)}</strong>
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  disabled={aiSaving}
                  onChange={(e) => toggleAi(e.target.checked)}
                />
                Enable AI for this workspace
              </label>
              {aiStatus ? <p className="text-sm text-muted-foreground">{aiStatus}</p> : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Update your account login password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button onClick={changePassword} disabled={changing}>
            {changing ? "Updating..." : "Update password"}
          </Button>
          {passwordStatus ? <p className="text-sm text-muted-foreground">{passwordStatus}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

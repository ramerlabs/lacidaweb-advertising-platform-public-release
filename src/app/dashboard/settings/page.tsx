"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [tokenBalance, setTokenBalance] = useState(0);
  const [platformAiEnabled, setPlatformAiEnabled] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessStatus, setBusinessStatus] = useState("");
  const [business, setBusiness] = useState({
    businessName: "",
    businessDescription: "",
    businessIndustry: "",
    businessAudience: "",
    businessWebsite: "",
    businessLocation: "",
    brandVoice: "",
  });

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/ai/generate?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.teamAiEnabled !== undefined) setAiEnabled(data.teamAiEnabled);
        if (data.tokenBalance !== undefined) setTokenBalance(data.tokenBalance);
        if (data.aiEnabled !== undefined) setPlatformAiEnabled(data.aiEnabled);
      });
    fetch(`/api/teams/business?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setBusiness({
            businessName: data.profile.businessName || "",
            businessDescription: data.profile.businessDescription || "",
            businessIndustry: data.profile.businessIndustry || "",
            businessAudience: data.profile.businessAudience || "",
            businessWebsite: data.profile.businessWebsite || "",
            businessLocation: data.profile.businessLocation || "",
            brandVoice: data.profile.brandVoice || "",
          });
        }
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

  async function saveBusinessProfile() {
    if (!teamId) return;
    setBusinessSaving(true);
    setBusinessStatus("");
    const res = await fetch("/api/teams/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, ...business }),
    });
    const data = await res.json();
    setBusinessSaving(false);
    if (!res.ok) {
      setBusinessStatus(data.error || "Failed to save business profile");
      return;
    }
    if (data.profile) {
      setBusiness({
        businessName: data.profile.businessName || "",
        businessDescription: data.profile.businessDescription || "",
        businessIndustry: data.profile.businessIndustry || "",
        businessAudience: data.profile.businessAudience || "",
        businessWebsite: data.profile.businessWebsite || "",
        businessLocation: data.profile.businessLocation || "",
        brandVoice: data.profile.brandVoice || "",
      });
    }
    setBusinessStatus(data.message || "Business profile saved");
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
          <CardDescription>Multi-tenant team workspace</CardDescription>
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
          <CardTitle>Business profile</CardTitle>
          <CardDescription>
            Tell AI about your business so captions and images match your brand, audience, and offers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business name</Label>
              <Input
                id="business-name"
                placeholder="e.g. lacidaweb"
                value={business.businessName}
                onChange={(e) => setBusiness((b) => ({ ...b, businessName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-industry">Industry</Label>
              <Input
                id="business-industry"
                placeholder="e.g. Fintech, e-commerce, agency"
                value={business.businessIndustry}
                onChange={(e) => setBusiness((b) => ({ ...b, businessIndustry: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="business-description">What you do</Label>
            <Textarea
              id="business-description"
              rows={3}
              placeholder="Describe your products, services, and what makes you different..."
              value={business.businessDescription}
              onChange={(e) => setBusiness((b) => ({ ...b, businessDescription: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business-audience">Target audience</Label>
            <Textarea
              id="business-audience"
              rows={2}
              placeholder="Who are you trying to reach? e.g. small business owners in the Philippines"
              value={business.businessAudience}
              onChange={(e) => setBusiness((b) => ({ ...b, businessAudience: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business-website">Website</Label>
              <Input
                id="business-website"
                placeholder="https://yoursite.com"
                value={business.businessWebsite}
                onChange={(e) => setBusiness((b) => ({ ...b, businessWebsite: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-location">Location / market</Label>
              <Input
                id="business-location"
                placeholder="e.g. Manila, Philippines"
                value={business.businessLocation}
                onChange={(e) => setBusiness((b) => ({ ...b, businessLocation: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-voice">Default brand voice</Label>
            <Input
              id="brand-voice"
              placeholder="e.g. friendly, expert, bold — used when AI writes posts"
              value={business.brandVoice}
              onChange={(e) => setBusiness((b) => ({ ...b, brandVoice: e.target.value }))}
            />
          </div>
          <Button onClick={saveBusinessProfile} disabled={businessSaving}>
            {businessSaving ? "Saving..." : "Save business profile"}
          </Button>
          {businessStatus ? <p className="text-sm text-muted-foreground">{businessStatus}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI generation</CardTitle>
          <CardDescription>
            Allow AI to auto-generate post captions and images using your token balance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!platformAiEnabled ? (
            <p className="text-sm text-muted-foreground">AI is not enabled on this platform yet.</p>
          ) : (
            <>
              <p className="text-sm">
                Token balance: <strong>{tokenBalance.toLocaleString()} tokens</strong>
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

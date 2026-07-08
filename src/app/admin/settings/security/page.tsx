"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AdminSecurityPage() {
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [resetting, setResetting] = useState(false);
  const [changing, setChanging] = useState(false);

  async function resetUserPassword() {
    if (!resetEmail.trim()) {
      setStatus("Enter the user's email address");
      return;
    }

    setResetting(true);
    setStatus("");
    const res = await fetch("/api/admin/security/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: resetEmail.trim(),
        newPassword: resetPassword.trim() || undefined,
        sendEmail: true,
      }),
    });
    const data = await res.json();
    setResetting(false);

    if (!res.ok) {
      setStatus(data.error || "Reset failed");
      return;
    }

    setStatus(data.message);
    setResetEmail("");
    setResetPassword("");
  }

  async function changeAdminPassword() {
    if (!currentPassword || !newPassword) {
      setStatus("Enter current and new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("New passwords do not match");
      return;
    }

    setChanging(true);
    setStatus("");
    const res = await fetch("/api/admin/security/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setChanging(false);

    if (!res.ok) {
      setStatus(data.error || "Change failed");
      return;
    }

    setStatus(data.message);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security</h1>
        <p className="text-muted-foreground">Reset client passwords and manage your admin account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reset user password</CardTitle>
          <CardDescription>
            Generate a new password for any client account. The user is emailed their new password when SMTP is
            configured (or via Telegram fallback).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">User email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="client@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-password">New password (optional)</Label>
            <Input
              id="reset-password"
              type="password"
              placeholder="Leave blank to auto-generate"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Minimum 8 characters if set manually.</p>
          </div>
          <Button onClick={resetUserPassword} disabled={resetting}>
            {resetting ? "Resetting..." : "Reset password & email user"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change your admin password</CardTitle>
          <CardDescription>Update the password for your platform admin account.</CardDescription>
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
          <Button onClick={changeAdminPassword} disabled={changing}>
            {changing ? "Updating..." : "Update admin password"}
          </Button>
        </CardContent>
      </Card>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}

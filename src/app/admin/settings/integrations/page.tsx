"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type IntegrationSettings = {
  zernioApiKeyMasked: string;
  hasZernioApiKey: boolean;
  hasZernioWebhookSecret: boolean;
  telegramEnabled: boolean;
  telegramChatId: string;
  telegramBotTokenMasked: string;
  hasTelegramBotToken: boolean;
  telegramNotifySupport: boolean;
  telegramNotifyPayments: boolean;
  telegramNotifyPosts: boolean;
  telegramNotifyAccounts: boolean;
  telegramNotifyUsers: boolean;
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpFromEmail: string;
  smtpFromName: string;
  hasSmtpPassword: boolean;
  smtpFallbackTelegram: boolean;
  googleOAuthEnabled: boolean;
  googleOAuthConfigured: boolean;
};

function NotifyToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function AdminIntegrationsPage() {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [zernioApiKey, setZernioApiKey] = useState("");
  const [zernioWebhookSecret, setZernioWebhookSecret] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpTestTo, setSmtpTestTo] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("/api/webhooks/inbox");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/webhooks/inbox`);
    }

    async function load() {
      const res = await fetch("/api/admin/settings/integrations");
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setSettings(data.settings);
        setTelegramChatId(data.settings.telegramChatId || "");
      }
    }
    load();
  }, []);

  async function copyWebhookUrl() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      setStatus("Could not copy webhook URL");
    }
  }

  function buildPayload() {
    if (!settings) return {};
    return {
      zernioApiKey: zernioApiKey.trim() || undefined,
      zernioWebhookSecret: zernioWebhookSecret.trim() || undefined,
      telegramEnabled: settings.telegramEnabled,
      telegramBotToken: telegramBotToken.trim() || undefined,
      telegramChatId: telegramChatId.trim() || undefined,
      telegramNotifySupport: settings.telegramNotifySupport,
      telegramNotifyPayments: settings.telegramNotifyPayments,
      telegramNotifyPosts: settings.telegramNotifyPosts,
      telegramNotifyAccounts: settings.telegramNotifyAccounts,
      telegramNotifyUsers: settings.telegramNotifyUsers,
      smtpEnabled: settings.smtpEnabled,
      smtpHost: settings.smtpHost || undefined,
      smtpPort: settings.smtpPort,
      smtpSecure: settings.smtpSecure,
      smtpUser: settings.smtpUser || undefined,
      smtpPassword: smtpPassword.trim() || undefined,
      smtpFromEmail: settings.smtpFromEmail || undefined,
      smtpFromName: settings.smtpFromName || undefined,
      smtpFallbackTelegram: settings.smtpFallbackTelegram,
      googleOAuthEnabled: settings.googleOAuthEnabled,
    };
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/admin/settings/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error || "Save failed");
      return;
    }
    setSettings(data.settings);
    setZernioApiKey("");
    setZernioWebhookSecret("");
    setTelegramBotToken("");
    setTelegramChatId(data.settings.telegramChatId || "");
    setSmtpPassword("");
    setStatus("Integration settings saved.");
  }

  async function testSmtp() {
    setTestingSmtp(true);
    setStatus("");
    const res = await fetch("/api/admin/settings/integrations/test-smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: smtpTestTo.trim() || undefined }),
    });
    const data = await res.json();
    setTestingSmtp(false);
    setStatus(res.ok ? data.message : data.error || "SMTP test failed");
  }

  async function testTelegram() {
    setTesting(true);
    setStatus("");
    const res = await fetch("/api/admin/settings/integrations/test-telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramBotToken: telegramBotToken.trim() || undefined,
        telegramChatId: telegramChatId.trim() || undefined,
      }),
    });
    const data = await res.json();
    setTesting(false);
    setStatus(res.ok ? data.message : data.error || "Telegram test failed");
  }

  if (loading || !settings) {
    return <p className="text-sm text-muted-foreground">Loading integration settings...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">Zernio API, email (SMTP), and Telegram admin alerts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zernio API</CardTitle>
          <CardDescription>Powers social account connections, publishing, inbox, and analytics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.hasZernioApiKey ? (
            <p className="text-sm text-muted-foreground">
              Current key: <code className="rounded bg-muted px-1">{settings.zernioApiKeyMasked}</code>
            </p>
          ) : (
            <p className="text-sm text-amber-700">No API key configured yet.</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="zernio-api-key">Zernio API key</Label>
            <Input
              id="zernio-api-key"
              type="password"
              placeholder="sk_..."
              value={zernioApiKey}
              onChange={(e) => setZernioApiKey(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zernio-webhook-secret">Webhook secret</Label>
            <Textarea
              id="zernio-webhook-secret"
              rows={2}
              value={zernioWebhookSecret}
              onChange={(e) => setZernioWebhookSecret(e.target.value)}
              placeholder="Same secret configured in your Zernio dashboard"
            />
            <p className="text-xs text-muted-foreground">
              Must match the <strong>exact</strong> signing secret from your Zernio webhook configuration
              (platform owner only). If Zernio shows 401 failures, re-copy the secret from Zernio → paste here →
              Save, then redeploy or wait for Vercel to pick up the change.
            </p>
          </div>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
            <Label>Inbox webhook URL</Label>
            <p className="text-xs text-muted-foreground">
              Paste this URL into the Zernio dashboard so comments, DMs, and post lifecycle events are delivered
              into client inboxes. Clients do not configure this.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={copyWebhookUrl}>
                {copiedWebhook ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              URL must be exactly: <code>{webhookUrl}</code> (or <code>/api/webhooks/zernio</code>).
              Events: <code>comment.received</code>, <code>message.received</code>, post lifecycle, and{" "}
              <code>webhook.test</code>. Use your production domain in Zernio (not localhost).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social login</CardTitle>
          <CardDescription>
            Google sign-in on login and register. API keys are set in environment variables on your host
            (Vercel).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.googleOAuthEnabled}
              disabled={!settings.googleOAuthConfigured}
              onChange={(e) =>
                setSettings((s) => s && { ...s, googleOAuthEnabled: e.target.checked })
              }
            />
            Enable Google login
            {!settings.googleOAuthConfigured ? (
              <span className="text-xs text-muted-foreground">(set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)</span>
            ) : null}
          </label>
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p>
              OAuth redirect URL (add in Google Cloud console):
            </p>
            <p>
              <code>{typeof window !== "undefined" ? window.location.origin : "https://lacidaweb.com"}/api/auth/callback/google</code>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Telegram notifications</CardTitle>
            <CardDescription>
              Get instant alerts for support tickets, payments, posts, new users, and account connections.
            </CardDescription>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.telegramEnabled}
              onChange={(e) => setSettings((s) => s && { ...s, telegramEnabled: e.target.checked })}
            />
            Enabled
          </label>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Create a bot with @BotFather, then get your chat ID from @userinfobot or your group chat.
          </p>
          {settings.hasTelegramBotToken ? (
            <p className="text-sm text-muted-foreground">
              Bot token: <code className="rounded bg-muted px-1">{settings.telegramBotTokenMasked}</code>
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="telegram-token">Bot token</Label>
            <Input
              id="telegram-token"
              type="password"
              placeholder="123456:ABC..."
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-chat">Chat ID</Label>
            <Input
              id="telegram-chat"
              placeholder="-1001234567890"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <NotifyToggle
              id="notify-support"
              label="Support tickets"
              checked={settings.telegramNotifySupport}
              onChange={(v) => setSettings((s) => s && { ...s, telegramNotifySupport: v })}
            />
            <NotifyToggle
              id="notify-payments"
              label="Payments"
              checked={settings.telegramNotifyPayments}
              onChange={(v) => setSettings((s) => s && { ...s, telegramNotifyPayments: v })}
            />
            <NotifyToggle
              id="notify-posts"
              label="Posts (publish / schedule)"
              checked={settings.telegramNotifyPosts}
              onChange={(v) => setSettings((s) => s && { ...s, telegramNotifyPosts: v })}
            />
            <NotifyToggle
              id="notify-accounts"
              label="Account connections"
              checked={settings.telegramNotifyAccounts}
              onChange={(v) => setSettings((s) => s && { ...s, telegramNotifyAccounts: v })}
            />
            <NotifyToggle
              id="notify-users"
              label="New registrations"
              checked={settings.telegramNotifyUsers}
              onChange={(v) => setSettings((s) => s && { ...s, telegramNotifyUsers: v })}
            />
          </div>

          <Button type="button" variant="outline" onClick={testTelegram} disabled={testing}>
            {testing ? "Sending test..." : "Send test message"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>SMTP email</CardTitle>
            <CardDescription>
              Send password reset and account emails. If SMTP fails, messages can fall back to your Telegram bot.
            </CardDescription>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.smtpEnabled}
              onChange={(e) => setSettings((s) => s && { ...s, smtpEnabled: e.target.checked })}
            />
            Enabled
          </label>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP host</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                value={settings.smtpHost}
                onChange={(e) => setSettings((s) => s && { ...s, smtpHost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                type="number"
                value={settings.smtpPort}
                onChange={(e) =>
                  setSettings((s) => s && { ...s, smtpPort: Number(e.target.value) || 587 })
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.smtpSecure}
              onChange={(e) => setSettings((s) => s && { ...s, smtpSecure: e.target.checked })}
            />
            Use SSL/TLS (port 465)
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-user">Username</Label>
              <Input
                id="smtp-user"
                value={settings.smtpUser}
                onChange={(e) => setSettings((s) => s && { ...s, smtpUser: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-password">Password</Label>
              <Input
                id="smtp-password"
                type="password"
                placeholder={settings.hasSmtpPassword ? "••••••••" : ""}
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-from-email">From email</Label>
              <Input
                id="smtp-from-email"
                type="email"
                placeholder="noreply@yourdomain.com"
                value={settings.smtpFromEmail}
                onChange={(e) => setSettings((s) => s && { ...s, smtpFromEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-from-name">From name</Label>
              <Input
                id="smtp-from-name"
                value={settings.smtpFromName}
                onChange={(e) => setSettings((s) => s && { ...s, smtpFromName: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.smtpFallbackTelegram}
              onChange={(e) =>
                setSettings((s) => s && { ...s, smtpFallbackTelegram: e.target.checked })
              }
            />
            Send via Telegram when SMTP fails
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="smtp-test-to">Test recipient</Label>
              <Input
                id="smtp-test-to"
                type="email"
                placeholder="your@email.com"
                value={smtpTestTo}
                onChange={(e) => setSmtpTestTo(e.target.value)}
              />
            </div>
            <Button type="button" variant="outline" onClick={testSmtp} disabled={testingSmtp}>
              {testingSmtp ? "Sending test..." : "Send test email"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save integration settings"}
        </Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </div>
    </div>
  );
}

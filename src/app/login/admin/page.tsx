"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  const { branding } = useSiteBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (res?.error) {
      setLoading(false);
      setError("Invalid email or password");
      return;
    }

    const check = await fetch("/api/auth/admin-check");
    const data = await check.json();

    if (!check.ok || !data.isAdmin) {
      await signOut({ redirect: false });
      setLoading(false);
      setError("This account is not authorized for the admin panel.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl");
    window.location.assign(callbackUrl?.startsWith("/admin") ? callbackUrl : "/admin");
  }

  return (
    <AuthShell
      title="Admin sign in"
      subtitle={`Platform control panel for ${branding.title} staff only`}
      accent="cyan"
    >
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
        <Shield className="h-4 w-4 shrink-0" />
        <span>Not for advertisers or publishers — use the client login pages instead.</span>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Admin email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in to admin"}
        </Button>
      </form>

      <div className="mt-5 space-y-2 text-center text-sm text-muted-foreground">
        <p>
          <Link href="/login/advertiser" className="font-medium text-primary underline underline-offset-2">
            Advertiser sign in
          </Link>
          {" · "}
          <Link href="/login/publisher" className="font-medium text-primary underline underline-offset-2">
            Publisher sign in
          </Link>
        </p>
        <p>
          <Link href="/" className="underline underline-offset-2">
            Back to home
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const { branding } = useSiteBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "banned") {
      setError("Your account has been banned. Contact support if you believe this is a mistake.");
      setBanReason(params.get("reason") || "");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setBanReason("");
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      const banRes = await fetch("/api/auth/ban-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const banData = await banRes.json().catch(() => ({ banned: false, banReason: null }));
      if (banData.banned) {
        setError("Your account has been banned. Contact support if you believe this is a mistake.");
        setBanReason(banData.banReason || "");
      } else {
        setError("Invalid email or password");
      }
      return;
    }

    // Full navigation so the session cookie is applied (SPA push can race cookies,
    // especially across www vs apex domains).
    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl");
    let nextPath = "/dashboard";
    if (callbackUrl) {
      try {
        const url = new URL(callbackUrl, window.location.origin);
        if (url.origin === window.location.origin) {
          nextPath = `${url.pathname}${url.search}${url.hash}` || "/dashboard";
        }
      } catch {
        if (callbackUrl.startsWith("/")) nextPath = callbackUrl;
      }
    }
    window.location.assign(nextPath);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your {branding.title} workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <div className="space-y-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900 dark:bg-rose-950/40">
                <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
                {banReason ? (
                  <p className="text-sm text-rose-800 dark:text-rose-200">
                    <span className="font-medium">Reason:</span> {banReason}
                  </p>
                ) : null}
              </div>
            ) : null}
            <Button className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="text-primary underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

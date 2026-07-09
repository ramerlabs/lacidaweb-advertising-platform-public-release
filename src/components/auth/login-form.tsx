"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { useSiteBranding } from "@/hooks/use-site-branding";
import type { ClientAccountType } from "@/lib/account-type";
import {
  accountTypeLabel,
  getDashboardHome,
  getLoginPath,
  getRegisterPath,
} from "@/lib/account-type";

export function LoginForm({ accountType }: { accountType: ClientAccountType }) {
  const { branding } = useSiteBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(false);

  const label = accountTypeLabel(accountType);
  const home = getDashboardHome(accountType);
  const otherType = accountType === "PUBLISHER" ? "ADVERTISER" : "PUBLISHER";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "banned") {
      setError("Your account has been banned. Contact support if you believe this is a mistake.");
      setBanReason(params.get("reason") || "");
    }
    if (params.get("error") === "wrong_account_type") {
      setError(`This email is registered as a ${accountTypeLabel(otherType).toLowerCase()}. Use the ${accountTypeLabel(otherType).toLowerCase()} sign-in page instead.`);
    }
  }, [otherType]);

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

    const meRes = await fetch("/api/auth/me");
    const me = await meRes.json();
    if (meRes.ok && me.accountType && me.accountType !== accountType) {
      await signOut({ redirect: false });
      setError(
        `This account is registered as a ${accountTypeLabel(me.accountType).toLowerCase()}. Please sign in on the ${accountTypeLabel(me.accountType).toLowerCase()} page.`,
      );
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl");
    let nextPath = home;
    if (callbackUrl) {
      try {
        const url = new URL(callbackUrl, window.location.origin);
        if (url.origin === window.location.origin) {
          nextPath = `${url.pathname}${url.search}${url.hash}` || home;
        }
      } catch {
        if (callbackUrl.startsWith("/")) nextPath = callbackUrl;
      }
    }
    window.location.assign(nextPath);
  }

  return (
    <AuthShell
      title={`${label} sign in`}
      subtitle={`Access your ${branding.title} ${label.toLowerCase()} dashboard`}
      accent={accountType === "PUBLISHER" ? "emerald" : "cyan"}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
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
            placeholder="••••••••"
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
        <Button
          className={`w-full ${accountType === "PUBLISHER" ? "bg-emerald-600 hover:bg-emerald-500" : ""}`}
          disabled={loading}
        >
          {loading ? "Signing in..." : `Sign in as ${label.toLowerCase()}`}
        </Button>
      </form>

      <div className="mt-5">
        <SocialAuthButtons callbackUrl={`/onboarding?type=${accountType.toLowerCase()}`} />
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {accountType === "ADVERTISER" ? "Publisher" : "Advertiser"} account?{" "}
        <Link href={getLoginPath(otherType)} className="font-medium text-primary underline underline-offset-2">
          Sign in here
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        New to {branding.title}?{" "}
        <Link href={getRegisterPath(accountType)} className="font-medium text-primary underline underline-offset-2">
          Create {label.toLowerCase()} account
        </Link>
        {" · "}
        <Link href="/login" className="underline underline-offset-2">
          All options
        </Link>
      </p>
    </AuthShell>
  );
}

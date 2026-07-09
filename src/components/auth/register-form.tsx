"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { getPlanById } from "@/lib/pricing";
import { useSiteBranding } from "@/hooks/use-site-branding";
import type { ClientAccountType } from "@/lib/account-type";
import {
  accountTypeLabel,
  getDashboardHome,
  getLoginPath,
  getRegisterPath,
} from "@/lib/account-type";

function RegisterFormContent({ accountType }: { accountType: ClientAccountType }) {
  const router = useRouter();
  const { branding } = useSiteBranding();
  const params = useSearchParams();
  const plan = accountType === "ADVERTISER" ? getPlanById(params.get("plan")) : null;
  const label = accountTypeLabel(accountType);
  const otherType = accountType === "PUBLISHER" ? "ADVERTISER" : "PUBLISHER";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    teamName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, accountType }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Registration failed");
      return;
    }

    const login = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      router.push(getLoginPath(accountType));
      return;
    }
    router.push(getDashboardHome(accountType));
  }

  const subtitle =
    accountType === "PUBLISHER"
      ? "Register your website publisher account — get embed code and monetize with lacidaweb ads."
      : plan
        ? `Create your advertiser workspace — suggested plan: ${plan.name}.`
        : "Create your advertiser workspace and fund your wallet when you're ready to run ads.";

  return (
    <AuthShell
      title={`Join as ${label.toLowerCase()}`}
      subtitle={subtitle}
      accent={accountType === "PUBLISHER" ? "emerald" : "cyan"}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Jane Smith"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teamName">
            {accountType === "PUBLISHER" ? "Website / brand name" : "Business / brand name"}
          </Label>
          <Input
            id="teamName"
            placeholder={accountType === "PUBLISHER" ? "My Blog Network" : "Acme Marketing"}
            value={form.teamName}
            onChange={(e) => setForm({ ...form, teamName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            required
          />
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button
          className={`w-full ${accountType === "PUBLISHER" ? "bg-emerald-600 hover:bg-emerald-500" : ""}`}
          disabled={loading}
        >
          {loading ? "Creating account..." : `Create ${label.toLowerCase()} account`}
        </Button>
      </form>

      <div className="mt-5">
        <SocialAuthButtons callbackUrl={`/onboarding?type=${accountType.toLowerCase()}`} />
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {accountType === "ADVERTISER" ? "Publisher" : "Advertiser"} instead?{" "}
        <Link href={getRegisterPath(otherType)} className="font-medium text-primary underline underline-offset-2">
          Register here
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={getLoginPath(accountType)} className="font-medium text-primary underline underline-offset-2">
          Sign in
        </Link>
        {" · "}
        <Link href="/register" className="underline underline-offset-2">
          All options
        </Link>
      </p>
    </AuthShell>
  );
}

export function RegisterForm({ accountType }: { accountType: ClientAccountType }) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-8 text-sm text-muted-foreground">
          Loading...
        </main>
      }
    >
      <RegisterFormContent accountType={accountType} />
    </Suspense>
  );
}

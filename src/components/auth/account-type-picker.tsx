"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, Globe } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import type { ClientAccountType } from "@/lib/account-type";
import { getLoginPath, getRegisterPath } from "@/lib/account-type";

type PickerMode = "login" | "register";

const OPTIONS: Array<{
  type: ClientAccountType;
  title: string;
  description: string;
  icon: typeof Megaphone;
  accent: "cyan" | "emerald";
}> = [
  {
    type: "ADVERTISER",
    title: "Advertiser",
    description: "Run lacidaweb ad campaigns, fund your wallet, and reach customers",
    icon: Megaphone,
    accent: "cyan",
  },
  {
    type: "PUBLISHER",
    title: "Publisher",
    description: "Monetize your website — embed our ad code and earn from advertiser campaigns",
    icon: Globe,
    accent: "emerald",
  },
];

export function AccountTypePicker({ mode }: { mode: PickerMode }) {
  const isLogin = mode === "login";

  return (
    <AuthShell
      title={isLogin ? "Sign in" : "Create account"}
      subtitle={
        isLogin
          ? "Choose how you use lacidaweb — advertisers and publishers have separate dashboards"
          : "Register as an advertiser or a publisher. You can only use one account type per email."
      }
    >
      <div className="space-y-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const href = isLogin ? getLoginPath(option.type) : getRegisterPath(option.type);
          const border =
            option.accent === "emerald" ? "border-emerald-500/30 hover:border-emerald-500/50" : "border-cyan-500/30 hover:border-cyan-500/50";
          const iconBg =
            option.accent === "emerald" ? "bg-emerald-500/15 text-emerald-400" : "bg-cyan-500/15 text-cyan-400";

          return (
            <Link
              key={option.type}
              href={href}
              className={`flex items-start gap-4 rounded-xl border bg-zinc-950/50 p-4 transition hover:bg-zinc-900 ${border}`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{option.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{option.description}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-500" />
            </Link>
          );
        })}
      </div>

      <p className="mt-5 text-center text-sm text-zinc-500">
        {isLogin ? (
          <>
            New here?{" "}
            <Link href="/register" className="font-medium text-cyan-400 underline underline-offset-2">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link href="/login" className="font-medium text-cyan-400 underline underline-offset-2">
              Sign in
            </Link>
          </>
        )}
      </p>
      <p className="mt-2 text-center text-sm text-zinc-500">
        Platform staff?{" "}
        <Link href="/login/admin" className="font-medium text-cyan-400 underline underline-offset-2">
          Admin sign in
        </Link>
      </p>
    </AuthShell>
  );
}

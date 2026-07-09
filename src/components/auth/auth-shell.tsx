"use client";

import Link from "next/link";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { SiteLogo } from "@/components/branding/site-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({
  children,
  title,
  subtitle,
  accent = "cyan",
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  accent?: "cyan" | "emerald";
}) {
  const { branding } = useSiteBranding();
  const glow = accent === "emerald" ? "shadow-emerald-500/10" : "glow-cyan";
  const gradient =
    accent === "emerald"
      ? "from-emerald-500/10 via-transparent to-cyan-500/5"
      : "from-cyan-500/10 via-transparent to-emerald-500/5";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="absolute inset-0 bg-dot opacity-40" />
      <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`} />

      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <SiteLogo branding={branding} href="/" onDark className="h-9 w-auto" />
        </div>

        <div className={`overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl backdrop-blur ${glow}`}>
          <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-5">
            <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          </div>
          <div className="px-6 py-6 text-zinc-100 [&_label]:text-zinc-300 [&_input]:border-zinc-700 [&_input]:bg-zinc-950 [&_input]:text-white">
            {children}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} {branding.title} ·{" "}
          <Link href="/" className="underline underline-offset-2 hover:text-zinc-300">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

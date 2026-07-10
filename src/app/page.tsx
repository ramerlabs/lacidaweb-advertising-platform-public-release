import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Megaphone,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";
import { SiteLogo } from "@/components/branding/site-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { FaqSection } from "@/components/landing/faq-section";
import { LandingAdStats } from "@/components/landing/landing-ad-stats";
import { LACIDAWEB_FAQS } from "@/lib/lacidaweb-faqs";
import { getAdsSettings, getLandingAdStatsDisplay } from "@/lib/ads-settings";
import { formatAdWalletUsd } from "@/lib/ad-wallet";

const FEATURES = [
  {
    icon: Megaphone,
    title: "Campaign wizard",
    description: "Objective → audience → budget → creative. Familiar flow, modern UI.",
    className: "md:col-span-2",
  },
  {
    icon: Wallet,
    title: "Prepaid wallet",
    description: "USDT, GCash, PayPal, ACH.",
    className: "",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "CTR, spend, conversions.",
    className: "",
  },
  {
    icon: Shield,
    title: "Compliance review",
    description: "Every ad reviewed before launch.",
    className: "md:col-span-2",
  },
];

const LACIDAWEB_FAQ_ITEMS = LACIDAWEB_FAQS.map((faq) => ({
  id: faq.id,
  question: faq.question,
  answer: faq.answer,
}));

const branding = {
  title: brand.name,
  product: brand.product,
  description: brand.positioning,
  logoUrl: brand.logoUrl,
  logoDarkUrl: "",
  logoHeightPx: 40,
  faviconUrl: brand.faviconUrl,
  domain: brand.domain,
  tagline: brand.tagline,
};

export default async function HomePage() {
  const [landingStats, adsSettings] = await Promise.all([
    getLandingAdStatsDisplay(),
    getAdsSettings(),
  ]);
  const serverTime = new Date().toISOString();
  const publisherSharePercent = Math.max(
    0,
    100 - Math.min(99, Math.max(0, adsSettings.adsProfitMarginPercent)),
  );
  const publisherCpmUsd = formatAdWalletUsd(adsSettings.publisherCpmCents);
  const publisherCpcUsd = formatAdWalletUsd(adsSettings.publisherCpcCents);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <SiteLogo branding={branding} href="/" onDark className="h-9 w-auto" />
          <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#features" className="transition hover:text-white">
              Product
            </a>
            <a href="#workflow" className="transition hover:text-white">
              Workflow
            </a>
            <a href="#publishers" className="transition hover:text-white">
              Publishers
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden text-zinc-300 hover:text-white sm:inline-flex">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
              <Link href="/register">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-grid opacity-[0.07]" />
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-1.5 text-sm text-zinc-300">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              {brand.product}
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl md:leading-[1.05]">
              Self-serve ads.
              <br />
              <span className="text-gradient">Ship campaigns faster.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">{brand.tagline}</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="h-12 bg-cyan-500 px-8 text-zinc-950 hover:bg-cyan-400">
                <Link href="/register/advertiser">Run ads</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="h-12 bg-emerald-600 px-8 hover:bg-emerald-500"
              >
                <Link href="/register/publisher">Monetize site</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-zinc-700 bg-transparent px-8 text-zinc-200 hover:bg-zinc-900"
              >
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <LandingAdStats
            initial={{
              impressions: landingStats.impressions,
              clicks: landingStats.clicks,
              fakeEnabled: landingStats.fakeEnabled,
              impressionsPerHour: landingStats.impressionsPerHour,
              clicksPerHour: landingStats.clicksPerHour,
              serverTime,
            }}
          />

          <div className="mx-auto mt-16 max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-2xl glow-cyan">
            <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs text-zinc-500">campaign-builder · lacidaweb</span>
            </div>
            <div className="grid gap-px bg-zinc-800 md:grid-cols-3">
              {[
                { icon: TrendingUp, label: "Awareness", active: true },
                { icon: Zap, label: "Traffic", active: false },
                { icon: Target, label: "Conversions", active: false },
              ].map((obj) => {
                const Icon = obj.icon;
                return (
                  <div
                    key={obj.label}
                    className={`flex items-center gap-3 bg-zinc-900 p-5 ${obj.active ? "ring-1 ring-inset ring-cyan-500/50" : ""}`}
                  >
                    <Icon className={`h-5 w-5 ${obj.active ? "text-cyan-400" : "text-zinc-600"}`} />
                    <span className={obj.active ? "font-medium text-white" : "text-zinc-500"}>{obj.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-zinc-800 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Product</p>
          <h2 className="mt-2 max-w-lg text-3xl font-bold tracking-tight md:text-4xl">
            Built for advertisers who move fast
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-zinc-700 ${feature.className}`}
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                    <Icon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-zinc-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Workflow</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Four steps to your first live ad
              </h2>
              <ol className="mt-8 space-y-6">
                {[
                  "Sign up and create your advertiser workspace",
                  "Top up wallet — USDT, GCash, PayPal, or bank",
                  "Build campaign with our guided wizard",
                  "Submit for review and track performance",
                ].map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 text-sm font-bold text-cyan-400">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-zinc-300">{step}</p>
                  </li>
                ))}
              </ol>
              <Button asChild className="mt-8 bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
                <Link href="/register">Get started</Link>
              </Button>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
              <h3 className="font-semibold text-white">Wallet gateways</h3>
              <ul className="mt-6 space-y-4">
                {["USDT (ERC-20 / TRC-20)", "GCash", "PayPal", "US Bank ACH"].map((method) => (
                  <li key={method} className="flex items-center gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    {method}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="publishers" className="border-t border-zinc-800 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            For publishers
          </p>
          <h2 className="mt-2 max-w-xl text-3xl font-bold tracking-tight md:text-4xl">
            Monetize your site with transparent rates
          </h2>
          <p className="mt-4 max-w-2xl text-zinc-400">
            Embed lacidaweb ads and earn on every valid view and click. Publishers receive{" "}
            <span className="font-medium text-emerald-400">{publisherSharePercent}%</span> of
            network ad spend — paid at the rates below.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <p className="text-sm text-zinc-400">Your share of ad spend</p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-emerald-400">
                {publisherSharePercent}%
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Credited to your publisher balance as traffic converts.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <p className="text-sm text-zinc-400">CPM — per 1,000 views</p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-white">${publisherCpmUsd}</p>
              <p className="mt-2 text-sm text-zinc-500">
                Paid in batches for every 1,000 valid impressions.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:col-span-2 lg:col-span-1">
              <p className="text-sm text-zinc-400">CPC — per valid click</p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-white">${publisherCpcUsd}</p>
              <p className="mt-2 text-sm text-zinc-500">
                Credited immediately on each valid click (bots filtered).
              </p>
            </div>
          </div>

          <div className="mt-10">
            <Button asChild size="lg" className="h-12 bg-emerald-600 px-8 hover:bg-emerald-500">
              <Link href="/register/publisher">
                Become a publisher
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-zinc-900/30 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold">Ready when you are</h2>
          <p className="mt-4 text-zinc-400">No subscription. No lock-in. Fund your wallet and run ads.</p>
          <Button asChild size="lg" className="mt-8 h-12 bg-cyan-500 px-10 text-zinc-950 hover:bg-cyan-400">
            <Link href="/register">Create account</Link>
          </Button>
        </div>
      </section>

      <FaqSection faqs={LACIDAWEB_FAQ_ITEMS} variant="dark" />

      <footer className="border-t border-zinc-800 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 sm:flex-row">
          <SiteLogo branding={branding} href="/" onDark className="h-7 w-auto opacity-90" />
          <p>© {new Date().getFullYear()} {brand.name}</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-zinc-300">
              Log in
            </Link>
            <Link href="/register" className="hover:text-zinc-300">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

import Link from "next/link";
import { CheckCircle2, BarChart3, Inbox, Calendar, Webhook, MessageSquare, Infinity, Sparkles, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { plans } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublishedFaqs } from "@/lib/faqs";
import { SiteLogo } from "@/components/branding/site-logo";
import { FaqSection } from "@/components/landing/faq-section";
import { PlatformsSection } from "@/components/landing/platforms-section";
import { AdsSection } from "@/components/landing/ads-section";
import { SocialProof } from "@/components/landing/social-proof";
import { ThemeToggle } from "@/components/theme-toggle";
import { UNLIMITED_HIGHLIGHTS } from "@/lib/platforms";

const features = [
  {
    icon: Sparkles,
    title: "AI post generator",
    text: "Auto-generate captions and images for your posts with built-in AI. Buy token packs, enable AI in your workspace, and publish faster from Compose.",
  },
  {
    icon: Calendar,
    title: "Unlimited scheduling",
    text: "Schedule unlimited posts across every connected channel — no publishing caps on your calendar.",
  },
  {
    icon: Inbox,
    title: "Unified inbox",
    text: "Manage comments and DMs from one dashboard with auto-reply rules.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    text: "Track impressions, reach, engagement, and follower growth per channel.",
  },
  {
    icon: MessageSquare,
    title: "Automations",
    text: "Keyword triggers for comment replies and private message follow-ups.",
  },
  {
    icon: Webhook,
    title: "Webhooks & integrations",
    text: "Real-time events for comments, messages, and publish lifecycle.",
  },
  {
    icon: Megaphone,
    title: "Paid advertising",
    text: "Connect your ad accounts and run campaigns on Meta, Google, TikTok, LinkedIn, Pinterest, and X — budgets, creatives, and goals in one dashboard.",
  },
];

export default async function HomePage() {
  const [site, faqs] = await Promise.all([getSiteSettings(), getPublishedFaqs()]);

  return (
    <main>
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <SiteLogo branding={site} textClassName="text-lg font-bold text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register?plan=growth">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="outline" className="mb-4">
            {site.product}
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Grow your business with {site.title}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-muted-foreground">{site.description}</p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">{site.tagline}</p>
          <p className="mx-auto mt-4 flex max-w-2xl items-center justify-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4 shrink-0" />
            AI-powered captions &amp; images — publish organically and run paid ads from one workspace
          </p>
          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-3">
            {UNLIMITED_HIGHLIGHTS.map((text) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm"
              >
                <Infinity className="h-3.5 w-3.5 text-primary" />
                {text}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register?plan=growth">Start free workspace</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#pricing">View pricing</a>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href="#platforms">Platforms</a>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href="#ads">Advertising</a>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href="#faq">FAQs</a>
            </Button>
          </div>
        </div>
      </section>

      <SocialProof />

      <section className="border-y bg-gradient-to-br from-primary/5 via-background to-primary/10 py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-6 md:grid-cols-2">
          <div>
            <Badge className="mb-3">AI built in</Badge>
            <h2 className="text-3xl font-bold tracking-tight">Write less. Publish more.</h2>
            <p className="mt-3 text-muted-foreground">
              Turn a short brief into ready-to-post copy and on-brand images. Connect your channels,
              open Compose, and let AI draft captions and visuals — you review, edit, and schedule in
              one flow.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Generate social captions tailored to each platform
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Create post images with AI when you need fresh creative
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Pay-as-you-go AI tokens — only use what you need
              </li>
            </ul>
            <Button asChild className="mt-6">
              <Link href="/register?plan=growth">Try AI in your workspace</Link>
            </Button>
          </div>
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                How AI posting works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-card p-3">
                <p className="font-medium text-foreground">1. Enable AI</p>
                <p className="mt-1">Turn on AI in Settings and top up tokens from Billing.</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="font-medium text-foreground">2. Compose with AI</p>
                <p className="mt-1">Describe your offer or campaign — AI writes the caption and can generate an image.</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="font-medium text-foreground">3. Publish everywhere</p>
                <p className="mt-1">Pick your connected accounts and publish now or schedule for later.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="mb-8 text-center text-3xl font-bold">Everything included</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title}>
                <CardHeader>
                  <Icon className="mb-2 h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription>{f.text}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <PlatformsSection />

      <AdsSection />

      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
          <p className="mt-2 text-muted-foreground">
            Choose the plan that fits your team. Pay securely with USDT, PayPal, or GCash. Add AI
            tokens anytime for auto-generated posts.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={plan.popular ? "border-primary shadow-[0_0_0_2px_rgba(124,58,237,0.2)]" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.popular ? <Badge>Most popular</Badge> : null}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">${plan.monthlyPrice}</div>
                  <p className="text-sm text-muted-foreground">/month · up to {plan.accountLimit} accounts</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Annual: ${plan.yearlyPrice}/year (${plan.yearlyPerMonth}/mo){" "}
                  <Badge variant="secondary" className="ml-1 align-middle">
                    Save 18%
                  </Badge>
                </p>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="grid gap-2">
                  <Button asChild>
                    <Link href={`/checkout?plan=${plan.id}`}>Buy {plan.name}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/register?plan=${plan.id}`}>Create account</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <FaqSection faqs={faqs} />

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {site.title} · {site.url} · {site.supportEmail}
        <span className="mx-2">·</span>
        <Link href="/status" className="underline hover:text-foreground">
          System status
        </Link>
      </footer>
    </main>
  );
}

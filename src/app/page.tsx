import Link from "next/link";
import { CheckCircle2, BarChart3, Inbox, Calendar, Webhook, MessageSquare, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { plans } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublishedFaqs } from "@/lib/faqs";
import { SiteLogo } from "@/components/branding/site-logo";
import { FaqSection } from "@/components/landing/faq-section";
import { PlatformsSection } from "@/components/landing/platforms-section";
import { ThemeToggle } from "@/components/theme-toggle";
import { UNLIMITED_HIGHLIGHTS } from "@/lib/platforms";

const features = [
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
];

export default async function HomePage() {
  const [site, faqs] = await Promise.all([getSiteSettings(), getPublishedFaqs()]);

  return (
    <main>
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <SiteLogo branding={site} textClassName="text-lg font-bold text-primary" />
            <p className="text-xs text-muted-foreground">{site.domain}</p>
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
              <a href="#faq">FAQs</a>
            </Button>
          </div>
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

      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
          <p className="mt-2 text-muted-foreground">
            Choose the plan that fits your team. Pay securely with USDT, PayPal, or GCash.
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
                  Annual: ${plan.yearlyPrice}/year (${plan.yearlyPerMonth}/mo)
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
      </footer>
    </main>
  );
}

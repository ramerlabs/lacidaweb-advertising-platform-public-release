import Link from "next/link";
import { CheckCircle2, Megaphone, Target, TrendingUp } from "lucide-react";
import { AD_GOALS, AD_PLATFORMS } from "@/lib/ads-platforms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdsSection() {
  return (
    <section id="ads" className="border-y bg-gradient-to-br from-violet-600/10 via-background to-fuchsia-500/10 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <Badge className="mb-4" variant="secondary">
            <Megaphone className="mr-1.5 h-3.5 w-3.5" />
            Paid advertising
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Run ads on every major platform — from one place
          </h2>
          <p className="mt-4 text-muted-foreground">
            Connect your own ad accounts and launch paid campaigns on Facebook, Instagram, Google,
            TikTok, LinkedIn, Pinterest, and X. Design creatives, set budgets, pick your goal, and go
            live without jumping between ad managers.
          </p>
        </div>

        <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AD_PLATFORMS.map((platform) => (
            <div
              key={platform.id}
              className="flex items-start gap-3 rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {platform.label.slice(0, 2)}
              </span>
              <div>
                <p className="font-semibold">{platform.label}</p>
                <p className="text-sm text-muted-foreground">{platform.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid items-stretch gap-8 lg:grid-cols-2">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />
                Built for real campaigns
              </CardTitle>
              <CardDescription>
                Create standalone ads with headline, image, destination URL, daily or lifetime budget,
                and audience targeting — the same workflow clients expect from modern ad tools.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium text-foreground">Campaign goals</p>
              <div className="flex flex-wrap gap-2">
                {AD_GOALS.map((goal) => (
                  <Badge key={goal.id} variant="outline">
                    {goal.label}
                  </Badge>
                ))}
              </div>
              <ul className="mt-4 space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Connect your Meta, Google, or TikTok ad account via secure OAuth
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Upload ad creative and launch from your workspace
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Track campaigns alongside organic posts and analytics
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Organic + paid, together
              </CardTitle>
              <CardDescription>
                Post for free reach, then put budget behind what works. One login, one dashboard,
                every channel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-background p-4">
                <p className="font-medium text-foreground">1. Connect your ad account</p>
                <p className="mt-1">
                  Link the ad platforms you already use — we never ask for your passwords, only
                  official OAuth access.
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="font-medium text-foreground">2. Design your ad</p>
                <p className="mt-1">
                  Add primary text, headline, image, and landing page URL. Set a daily or total
                  budget that fits your business.
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="font-medium text-foreground">3. Launch &amp; monitor</p>
                <p className="mt-1">
                  Publish to Facebook &amp; Instagram, Google, TikTok, LinkedIn, Pinterest, or X and
                  manage performance next to your social content.
                </p>
              </div>
              <Button asChild className="w-full sm:w-auto">
                <Link href="/register?plan=growth">Start running ads</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

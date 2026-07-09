"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";

type Overview = {
  users: number;
  teams: number;
  activeSubs: number;
  pendingPayments: number;
  openTickets: number;
  mrrApprox: number;
};

type AiStats = {
  tokensSold: number;
  tokenRevenueUsd: number;
  usageCount: number;
  tokensConsumed: number;
  profitUsd: string;
  topTeams: Array<{ name: string; slug: string; aiTokenBalance: number }>;
};

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [aiStats, setAiStats] = useState<AiStats | null>(null);
  const [siteTitle, setSiteTitle] = useState("");

  useEffect(() => {
    async function load() {
      const [overviewRes, brandingRes, aiRes] = await Promise.all([
        fetch("/api/admin/overview"),
        fetch("/api/branding"),
        fetch("/api/admin/ai-stats"),
      ]);
      const ov = await overviewRes.json();
      const branding = await brandingRes.json();
      const ai = await aiRes.json();
      if (overviewRes.ok) setOverview(ov);
      if (brandingRes.ok) setSiteTitle(branding.settings?.title || "");
      if (aiRes.ok) setAiStats(ai);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{siteTitle || brand.name} Admin</h1>
        <p className="text-muted-foreground">{brand.domain} — customers, revenue, and support</p>
      </div>

      {overview ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Metric label="Users" value={overview.users} />
          <Metric label="Teams" value={overview.teams} />
          <Metric label="Active Subs" value={overview.activeSubs} />
          <Metric label="Pending Payments" value={overview.pendingPayments} />
          <Metric label="Open Tickets" value={overview.openTickets} />
          <Metric label="Revenue (month)" value={`$${overview.mrrApprox}`} />
        </div>
      ) : null}

      {aiStats ? (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">AI tokens</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Metric label="Token revenue" value={`$${aiStats.tokenRevenueUsd}`} />
            <Metric label="Tokens sold" value={aiStats.tokensSold.toLocaleString()} />
            <Metric label="Tokens used" value={aiStats.tokensConsumed.toLocaleString()} />
            <Metric label="Generations" value={aiStats.usageCount} />
            <Metric label="Est. profit" value={`$${aiStats.profitUsd}`} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>View, edit, manage plans, reset passwords, ban</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/admin/users">Manage users</Link>
          </Button>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              Payments
              {overview && overview.pendingPayments > 0 ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {overview.pendingPayments}
                </span>
              ) : null}
            </CardTitle>
            <CardDescription>Review and approve client payments</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/admin/payments">Open payments</Link>
          </Button>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              Support
              {overview && overview.openTickets > 0 ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {overview.openTickets}
                </span>
              ) : null}
            </CardTitle>
            <CardDescription>Reply to client support tickets</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/admin/support">Open support queue</Link>
          </Button>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment details</CardTitle>
            <CardDescription>USDT wallet, PayPal, and GCash</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/admin/settings/payments">Configure payments</Link>
          </Button>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI & tokens</CardTitle>
            <CardDescription>OpenAI key, margin, token packs, trial tokens</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/admin/settings/ai">Configure AI</Link>
          </Button>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ads</CardTitle>
            <CardDescription>Enable paid ads — clients connect their own ad accounts (no platform fee)</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/admin/settings/ads">Configure ads</Link>
          </Button>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Audit log</CardTitle>
            <CardDescription>Platform actions and admin activity</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/admin/audit">View audit log</Link>
          </Button>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Title, description, logo, and favicon</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/admin/settings/branding">Configure branding</Link>
          </Button>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>FAQs</CardTitle>
            <CardDescription>Landing page questions and answers</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/admin/settings/faqs">Manage FAQs</Link>
          </Button>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Reset client passwords and change admin password</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/admin/settings/security">Open security</Link>
          </Button>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Zernio API and Telegram admin alerts</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/admin/settings/integrations">Configure integrations</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

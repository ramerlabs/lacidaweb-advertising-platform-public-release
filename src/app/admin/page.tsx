"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Headset,
  Link2,
  Megaphone,
  PenSquare,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";

type Overview = {
  users: number;
  teams: number;
  pendingPayments: number;
  openTickets: number;
  resolvedTickets: number;
  revenueMonthUsd: string;
  totalCampaigns: number;
  pendingReview: number;
  activeCampaigns: number;
  walletTotalUsd: string;
  publishers: number;
  publisherSites: number;
  adPlacements: number;
  networkImpressions: number;
  advertiserSpendMonthUsd: string;
  publisherPaidMonthUsd: string;
  adProfitMonthUsd: string;
  adProfitMonthCents: number;
  advertiserSpendAllUsd: string;
  publisherPaidAllUsd: string;
  adProfitAllUsd: string;
  adProfitAllCents: number;
};

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setOverview(data);
      });
  }, []);

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-zinc-950 to-emerald-500/10 p-6 md:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-500">Control panel</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
            {brand.name} Admin
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Platform health across advertising, publishing, payments, and support
          </p>
        </div>
      </div>

      {overview ? (
        <>
          <section className="space-y-4">
            <SectionHeader title="Ad network profit" icon={PiggyBank} accent="cyan" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={(overview.adProfitMonthCents ?? 0) >= 0 ? TrendingUp : TrendingDown}
                label="Profit this month"
                value={`$${overview.adProfitMonthUsd ?? "0.00"}`}
                highlight
                accent={(overview.adProfitMonthCents ?? 0) >= 0 ? "emerald" : "cyan"}
                valueClassName={
                  (overview.adProfitMonthCents ?? 0) < 0
                    ? "text-rose-500"
                    : (overview.adProfitMonthCents ?? 0) > 0
                      ? "text-emerald-500"
                      : undefined
                }
              />
              <MetricCard
                icon={PiggyBank}
                label="Profit all time"
                value={`$${overview.adProfitAllUsd ?? "0.00"}`}
                accent={(overview.adProfitAllCents ?? 0) >= 0 ? "emerald" : "cyan"}
                valueClassName={
                  (overview.adProfitAllCents ?? 0) < 0
                    ? "text-rose-500"
                    : (overview.adProfitAllCents ?? 0) > 0
                      ? "text-emerald-500"
                      : undefined
                }
              />
              <MetricCard
                icon={Wallet}
                label="Advertiser spend (month)"
                value={`$${overview.advertiserSpendMonthUsd ?? "0.00"}`}
                accent="cyan"
              />
              <MetricCard
                icon={Users}
                label="Publisher payouts (month)"
                value={`$${overview.publisherPaidMonthUsd ?? "0.00"}`}
                accent="emerald"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Profit = advertiser ad spend − publisher earnings. Fixed split: 32% platform / 68%
              publisher (15% buy-side fee, then 80% of net to publishers). Configure rates under{" "}
              <Link href="/admin/settings/ads" className="underline underline-offset-2">
                Publisher ads
              </Link>
              .
            </p>
          </section>

          <section className="space-y-4">
            <SectionHeader title="Advertising" icon={Megaphone} accent="cyan" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={Megaphone}
                label="Campaigns"
                value={overview.totalCampaigns}
                accent="cyan"
              />
              <MetricCard
                icon={TrendingUp}
                label="Active ads"
                value={overview.activeCampaigns}
                highlight
                accent="cyan"
              />
              <MetricCard
                icon={Wallet}
                label="Wallet float"
                value={`$${overview.walletTotalUsd}`}
                accent="cyan"
              />
              <MetricCard
                icon={Megaphone}
                label="Pending review"
                value={overview.pendingReview}
                badge={overview.pendingReview > 0}
                accent="cyan"
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader title="Publishing" icon={PenSquare} accent="emerald" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={Users}
                label="Publisher teams"
                value={overview.publishers}
                accent="emerald"
              />
              <MetricCard
                icon={Link2}
                label="Publisher websites"
                value={overview.publisherSites ?? 0}
                accent="emerald"
              />
              <MetricCard
                icon={PenSquare}
                label="Ad placements"
                value={overview.adPlacements ?? 0}
                accent="emerald"
              />
              <MetricCard
                icon={PenSquare}
                label="Network impressions"
                value={overview.networkImpressions ?? 0}
                accent="emerald"
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader title="Platform" icon={Users} accent="zinc" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={Users} label="Users" value={overview.users} />
              <MetricCard icon={Users} label="Teams" value={overview.teams} />
              <MetricCard
                icon={CreditCard}
                label="Pending payments"
                value={overview.pendingPayments}
                badge={overview.pendingPayments > 0}
              />
              <MetricCard
                icon={TrendingUp}
                label="Revenue (month)"
                value={`$${overview.revenueMonthUsd}`}
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader title="Action queue" icon={Headset} accent="cyan" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ActionCard
                title="Campaign review"
                description="Approve or reject submitted ad campaigns"
                href="/admin/campaigns"
                badge={overview.pendingReview}
                accent="cyan"
              />
              <ActionCard
                title="Payment verification"
                description="Confirm wallet top-ups and transactions"
                href="/admin/payments"
                badge={overview.pendingPayments}
                accent="cyan"
              />
              <ActionCard
                title="Support queue"
                description="Reply, close, or delete support tickets"
                href="/admin/support"
                badge={overview.openTickets}
                accent="cyan"
              />
              <ActionCard
                title="Users & teams"
                description="Manage advertiser and publisher workspaces"
                href="/admin/users"
              />
              <ActionCard
                title="Payment gateways"
                description="USDT, GCash, PayPal, and bank settings"
                href="/admin/settings/payments"
              />
              <ActionCard
                title="Branding & FAQs"
                description="Logo, landing page, and site content"
                href="/admin/settings/branding"
              />
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Loading platform metrics…</p>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  icon: Icon,
  accent = "zinc",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "cyan" | "emerald" | "zinc";
}) {
  const color =
    accent === "cyan"
      ? "text-cyan-500"
      : accent === "emerald"
        ? "text-emerald-500"
        : "text-zinc-500";
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">{title}</h2>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  highlight,
  badge,
  accent = "zinc",
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  highlight?: boolean;
  badge?: boolean;
  accent?: "cyan" | "emerald" | "zinc";
  valueClassName?: string;
}) {
  const border =
    accent === "cyan"
      ? "border-cyan-500/20"
      : accent === "emerald"
        ? "border-emerald-500/20"
        : "";
  const gradient =
    highlight || accent !== "zinc"
      ? accent === "emerald"
        ? "bg-gradient-to-br from-emerald-500/5 to-cyan-500/5"
        : "bg-gradient-to-br from-cyan-500/5 to-emerald-500/5"
      : "";

  return (
    <Card className={`shadow-sm ${border} ${gradient}`}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon
            className={`h-4 w-4 ${
              accent === "cyan"
                ? "text-cyan-500"
                : accent === "emerald"
                  ? "text-emerald-500"
                  : "text-muted-foreground"
            }`}
          />
          {label}
        </CardDescription>
        <CardTitle
          className={`text-3xl tabular-nums ${badge ? "text-amber-600 dark:text-amber-400" : ""} ${valueClassName || ""}`}
        >
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function ActionCard({
  title,
  description,
  href,
  badge,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  badge?: number;
  accent?: "cyan" | "emerald";
}) {
  return (
    <Card className="flex flex-col shadow-sm transition hover:border-cyan-500/20">
      <CardHeader className="flex-1">
        <CardTitle className="flex items-center justify-between gap-2 text-lg">
          {title}
          {badge && badge > 0 ? (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold text-zinc-950 ${
                accent === "emerald" ? "bg-emerald-500" : "bg-cyan-500"
              }`}
            >
              {badge}
            </span>
          ) : null}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>Open</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

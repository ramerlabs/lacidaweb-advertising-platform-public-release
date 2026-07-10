"use client";

import { useEffect, useState } from "react";
import { formatStatCount } from "@/lib/landing-stats";

type LandingAdStatsPayload = {
  impressions: number;
  clicks: number;
  fakeEnabled: boolean;
  impressionsPerHour: number;
  clicksPerHour: number;
  serverTime: string;
};

type Props = {
  initial: {
    impressions: number;
    clicks: number;
    fakeEnabled: boolean;
    impressionsPerHour: number;
    clicksPerHour: number;
    serverTime?: string;
  };
};

function extrapolate(
  base: number,
  perHour: number,
  fakeEnabled: boolean,
  serverTime: string,
  now: number,
): number {
  if (!fakeEnabled || perHour <= 0) return base;
  const started = Date.parse(serverTime);
  if (!Number.isFinite(started)) return base;
  const hours = Math.max(0, (now - started) / 3_600_000);
  return Math.floor(base + hours * perHour);
}

export function LandingAdStats({ initial }: Props) {
  const [payload, setPayload] = useState<LandingAdStatsPayload>({
    impressions: initial.impressions,
    clicks: initial.clicks,
    fakeEnabled: initial.fakeEnabled,
    impressionsPerHour: initial.impressionsPerHour,
    clicksPerHour: initial.clicksPerHour,
    serverTime: initial.serverTime ?? new Date().toISOString(),
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch("/api/public/landing-stats", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as LandingAdStatsPayload;
        if (!cancelled) {
          setPayload(data);
          setNow(Date.now());
        }
      } catch {
        // keep last known values
      }
    }
    refresh();
    const poll = window.setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (!payload.fakeEnabled) return;
    const tick = window.setInterval(() => setNow(Date.now()), 2_000);
    return () => window.clearInterval(tick);
  }, [payload.fakeEnabled]);

  const impressions = extrapolate(
    payload.impressions,
    payload.impressionsPerHour,
    payload.fakeEnabled,
    payload.serverTime,
    now,
  );
  const clicks = extrapolate(
    payload.clicks,
    payload.clicksPerHour,
    payload.fakeEnabled,
    payload.serverTime,
    now,
  );

  const stats = [
    { value: formatStatCount(impressions), label: "Network impressions" },
    { value: formatStatCount(clicks), label: "Network clicks" },
    { value: "24h", label: "Review turnaround" },
  ];

  return (
    <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-zinc-800 pt-10">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <p className="text-2xl font-bold tabular-nums text-cyan-400 md:text-3xl">{stat.value}</p>
          <p className="mt-1 text-xs text-zinc-500 md:text-sm">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

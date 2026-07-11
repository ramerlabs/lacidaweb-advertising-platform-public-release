import { NextResponse } from "next/server";
import { getAdsSettings } from "@/lib/ads-settings";
import { getAutoAdsConfig } from "@/lib/publisher-auto-ads";
import { isPlatformLicensed } from "@/lib/license";
import { prisma } from "@/lib/prisma";
import {
  canServeOnHost,
  isOpenNetworkKey,
  isPersonalAllowlistKey,
  requestHostFromHeaders,
} from "@/lib/domain-approval";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    if (!(await isPlatformLicensed())) {
      return NextResponse.json({ enabled: false, slots: [] }, { headers: corsHeaders });
    }

    const siteKey = new URL(req.url).searchParams.get("site");
    if (!siteKey) {
      return NextResponse.json({ error: "site required" }, { status: 400, headers: corsHeaders });
    }

    const platform = await getAdsSettings();
    if (!platform.adsEnabled || !platform.publisherAutoAdsEnabled) {
      return NextResponse.json({ enabled: false, slots: [] }, { headers: corsHeaders });
    }

    const isPersonal = isPersonalAllowlistKey(siteKey);
    const isNetwork = isOpenNetworkKey(siteKey);
    const requestHost = requestHostFromHeaders(req);

    const config = await getAutoAdsConfig(siteKey);
    if (!config || !config.autoAdsEnabled) {
      return NextResponse.json({ enabled: false, slots: [] }, { headers: corsHeaders });
    }

    // Load per-team domain policy for this site (platform keys use their team too).
    const siteRow = await prisma.publisherSite.findUnique({
      where: { id: config.siteId },
      select: {
        domain: true,
        team: {
          select: { requireDomainApproval: true, allowedAdDomains: true },
        },
      },
    });
    const teamPolicy = siteRow?.team;
    const requireDomainApproval = teamPolicy?.requireDomainApproval ?? true;
    const allowedAdDomains = teamPolicy?.allowedAdDomains || "";

    if (isPersonal) {
      if (
        !canServeOnHost({
          requireDomainApproval: true,
          allowedAdDomains,
          requestHost,
          isPersonalKey: true,
        })
      ) {
        return NextResponse.json({ enabled: false, slots: [] }, { headers: corsHeaders });
      }
    } else if (!isNetwork) {
      if (
        !canServeOnHost({
          requireDomainApproval,
          allowedAdDomains,
          requestHost,
          siteDomain: siteRow?.domain || config.domain,
          isPersonalKey: false,
        })
      ) {
        return NextResponse.json({ enabled: false, slots: [] }, { headers: corsHeaders });
      }
    }

    return NextResponse.json(
      {
        enabled: true,
        domain: config.domain,
        rotationSeconds: platform.publisherAdRotateSeconds,
        maxAds: config.maxAds ?? 4,
        slots: config.slots,
        personal: Boolean(config.isPersonal),
        openNetwork: Boolean(config.isOpenNetwork) || isNetwork,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}

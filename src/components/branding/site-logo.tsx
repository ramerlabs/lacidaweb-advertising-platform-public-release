"use client";

import type { SiteSettingsData } from "@/lib/site-settings";

type Branding = Pick<
  SiteSettingsData,
  "title" | "product" | "description" | "logoUrl" | "faviconUrl" | "domain" | "tagline"
>;

export function SiteLogo({
  branding,
  className = "h-8 w-auto max-w-[180px] object-contain",
  textClassName = "text-lg font-bold text-primary",
}: {
  branding: Branding;
  className?: string;
  textClassName?: string;
}) {
  if (branding.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={branding.logoUrl} alt={branding.title} className={className} />
    );
  }
  return <span className={textClassName}>{branding.title}</span>;
}

export function SiteLogoMark({
  branding,
  size = 32,
}: {
  branding: Branding;
  size?: number;
}) {
  if (branding.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={branding.logoUrl}
        alt={branding.title}
        width={size}
        height={size}
        className="rounded object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground"
      style={{ width: size, height: size }}
    >
      {branding.title.slice(0, 2).toUpperCase()}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import type { SiteSettingsData } from "@/lib/site-settings";

type Branding = Pick<
  SiteSettingsData,
  "title" | "product" | "description" | "logoUrl" | "logoDarkUrl" | "logoHeightPx" | "faviconUrl" | "domain" | "tagline"
>;

export function SiteLogo({
  branding,
  className,
  textClassName = "text-lg font-bold text-primary",
  forceTheme,
  href = "/",
}: {
  branding: Branding;
  className?: string;
  textClassName?: string;
  forceTheme?: "light" | "dark";
  /** Link target; pass null to render without a link (e.g. admin preview). */
  href?: string | null;
}) {
  const { theme, mounted } = useTheme();
  const activeTheme = forceTheme || (mounted ? theme : "light");
  const logoUrl =
    activeTheme === "dark" && branding.logoDarkUrl ? branding.logoDarkUrl : branding.logoUrl;
  const height = branding.logoHeightPx || 40;
  const imgClass = className || "w-auto max-w-[220px] object-contain";

  const content = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={branding.title}
      className={imgClass}
      style={{ height, width: "auto" }}
    />
  ) : (
    <span className={textClassName}>{branding.title}</span>
  );

  if (href === null) {
    return content;
  }

  return (
    <Link
      href={href}
      className="inline-block rounded-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label={`${branding.title} — home`}
    >
      {content}
    </Link>
  );
}

export function SiteLogoMark({
  branding,
  size,
}: {
  branding: Branding;
  size?: number;
}) {
  const { theme, mounted } = useTheme();
  const activeTheme = mounted ? theme : "light";
  const logoUrl =
    activeTheme === "dark" && branding.logoDarkUrl ? branding.logoDarkUrl : branding.logoUrl;
  const markSize = size || branding.logoHeightPx || 32;

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={branding.title}
        className="rounded object-contain"
        style={{ width: markSize, height: markSize }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground"
      style={{ width: markSize, height: markSize }}
    >
      {branding.title.slice(0, 2).toUpperCase()}
    </div>
  );
}

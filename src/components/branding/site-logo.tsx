"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { LacidawebLogo, LacidawebLogoMark } from "@/components/branding/lacidaweb-logo";
import { cn } from "@/lib/utils";
import type { SiteSettingsData } from "@/lib/site-settings";

type Branding = Pick<
  SiteSettingsData,
  "title" | "product" | "description" | "logoUrl" | "logoDarkUrl" | "logoHeightPx" | "faviconUrl" | "domain" | "tagline"
>;

function isDefaultLacidawebLogo(url: string | undefined) {
  if (!url) return true;
  return url.includes("/branding/logo.svg") || url.includes("/branding/logo-on-dark.svg");
}

export function SiteLogo({
  branding,
  className,
  textClassName = "text-lg font-bold text-primary",
  forceTheme,
  onDark = false,
  href = "/",
}: {
  branding: Branding;
  className?: string;
  textClassName?: string;
  forceTheme?: "light" | "dark";
  /** Render logo for dark backgrounds (sidebar, landing hero) */
  onDark?: boolean;
  href?: string | null;
}) {
  const { theme, mounted } = useTheme();
  const activeTheme = forceTheme || (mounted ? theme : "light");
  const height = branding.logoHeightPx || 40;

  const customUrl =
    onDark || activeTheme === "dark"
      ? branding.logoDarkUrl || branding.logoUrl
      : branding.logoUrl;

  const useBuiltin = isDefaultLacidawebLogo(customUrl) && isDefaultLacidawebLogo(branding.logoUrl);

  const content = useBuiltin ? (
    <LacidawebLogo
      height={height}
      variant={onDark || activeTheme === "dark" ? "on-dark" : "default"}
      className={className}
    />
  ) : customUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={customUrl}
      alt={branding.title}
      className={className || "w-auto max-w-[220px] object-contain"}
      style={{ height, width: "auto" }}
    />
  ) : (
    <span
      className={cn(
        "bg-gradient-to-r from-cyan-500 to-emerald-500 bg-clip-text text-transparent",
        textClassName.replace(/text-primary|text-\S+/g, "").trim() || "text-lg font-bold",
      )}
    >
      {branding.title}
    </span>
  );

  if (href === null) {
    return content;
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
  const markSize = size || branding.logoHeightPx || 32;

  if (isDefaultLacidawebLogo(branding.logoUrl)) {
    return <LacidawebLogoMark size={markSize} />;
  }

  const activeTheme = mounted ? theme : "light";
  const logoUrl =
    activeTheme === "dark" && branding.logoDarkUrl ? branding.logoDarkUrl : branding.logoUrl;

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
      className="flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 text-xs font-bold text-white"
      style={{ width: markSize, height: markSize }}
    >
      {branding.title.slice(0, 1).toUpperCase()}
    </div>
  );
}

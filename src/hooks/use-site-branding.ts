"use client";

import { useEffect, useState } from "react";
import { brand } from "@/lib/brand";

export type PublicBranding = {
  title: string;
  product: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  domain: string;
  tagline: string;
};

const FALLBACK: PublicBranding = {
  title: brand.name,
  product: brand.product,
  description: brand.positioning,
  logoUrl: "",
  faviconUrl: "",
  domain: brand.domain,
  tagline: brand.tagline,
};

let cachedBranding: PublicBranding | null = null;
let inflight: Promise<PublicBranding> | null = null;

async function fetchBranding(): Promise<PublicBranding> {
  if (cachedBranding) return cachedBranding;
  if (inflight) return inflight;

  inflight = fetch("/api/branding")
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load branding");
      cachedBranding = data.settings as PublicBranding;
      return cachedBranding;
    })
    .catch(() => FALLBACK)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function useSiteBranding() {
  const [branding, setBranding] = useState<PublicBranding>(cachedBranding || FALLBACK);
  const [loading, setLoading] = useState(!cachedBranding);

  useEffect(() => {
    let active = true;
    fetchBranding().then((data) => {
      if (active) {
        setBranding(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { branding, loading };
}

export function invalidateBrandingCache() {
  cachedBranding = null;
}

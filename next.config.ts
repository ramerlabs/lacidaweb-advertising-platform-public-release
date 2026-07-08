import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  eslint: {
    // Hook dependency warnings should not block Vercel production builds
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Do NOT redirect www <-> apex here. Vercel Domains already handles that.
  // App-level redirects cause ERR_TOO_MANY_REDIRECTS when they conflict.
};

export default nextConfig;

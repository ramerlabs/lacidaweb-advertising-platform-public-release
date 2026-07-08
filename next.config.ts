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
  async redirects() {
    return [
      // Keep auth cookies on one host (apex). Avoid www <-> apex session loss.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.vccandbank.com" }],
        destination: "https://vccandbank.com/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

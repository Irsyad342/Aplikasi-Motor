import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" hanya untuk self-hosting/sandbox; Vercel memakai output default-nya
  output: process.env.VERCEL === "1" ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
};

export default nextConfig;

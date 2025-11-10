import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',       // ← important
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // (optional) whatever else you’re using
  },
};

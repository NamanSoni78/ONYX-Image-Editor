import type { NextConfig } from "next";

/**
 * ONYX v2 — Static export configuration.
 *
 * Everything renders to static HTML/JS/CSS in `out/` and is served from the
 * CDN. This means ZERO serverless function invocations on Vercel, so the
 * hobby-plan Fluid CPU allowance is never consumed by traffic.
 *
 * Security headers live in `vercel.json` (headers() is ignored with
 * output: 'export').
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  poweredByHeader: false,
  compress: true,
  trailingSlash: false,
  images: {
    unoptimized: true, // No next/image usage; editor is client-side anyway
  },
};

export default nextConfig;

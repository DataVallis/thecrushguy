import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Docker image runs .next/standalone/server.js (docs/runbooks/deploy-dev.md)
  poweredByHeader: false,
  cacheComponents: true,
  // One branded 404 for unmatched URLs: we have multiple root layouts ([locale], admin) — TASK-014, ADR-028.
  experimental: { globalNotFound: true },
  partialPrefetching: true,
  typedRoutes: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

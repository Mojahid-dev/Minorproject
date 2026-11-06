import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF.js dynamically imports its worker. Keep the package intact on the
  // server so that import resolves from its own legacy Node build on Vercel.
  serverExternalPackages: ["pdfjs-dist"],
  async headers() {
    return [
      {
        // The push service worker must never be served from a stale cache,
        // otherwise users would keep an old version after a deploy.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;

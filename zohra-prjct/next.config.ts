import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF.js dynamically imports its worker. Keep the package intact on the
  // server so that import resolves from its own legacy Node build on Vercel.
  serverExternalPackages: ["pdfjs-dist"],
  // The worker is loaded dynamically by PDF.js, so Next's static file tracer
  // cannot discover it. Include it in the upload route's Vercel function.
  outputFileTracingIncludes: {
    "/api/resources/upload": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF.js dynamically imports its worker. Keep the package intact on the
  // server so that import resolves from its own legacy Node build on Vercel.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;

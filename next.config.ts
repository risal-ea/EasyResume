import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local single-user app: keep the dev/build output quiet and predictable.
  poweredByHeader: false,
  devIndicators: false,
  // Resume text extraction and rendering run in Node; load these from node_modules instead of
  // bundling them (pdfkit reads its font metrics from files next to its own code).
  serverExternalPackages: ["pdf-parse", "mammoth", "pdfkit", "docx"],
  experimental: {
    // Uploaded resumes go through a Server Action (default limit 1 MB); the app itself caps files at 10 MB.
    serverActions: { bodySizeLimit: "11mb" },
  },
};

export default nextConfig;

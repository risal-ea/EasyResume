import type { NextConfig } from "next";

// `npm run build:site` exports just the landing page as static files for GitHub Pages. Only *.site.tsx files are
// routes in that build, because the app itself needs a Node server (server actions, file storage).
const site = process.env.EASYRESUME_SITE === "1";

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
  ...(site && {
    output: "export",
    // Where the static files go. Next still builds in .next first, replacing the app's build, so
    // `npm run build:site` runs a normal `next build` again afterwards.
    distDir: "out",
    // GitHub Pages serves a project site under /<repo>; the deploy workflow passes that path in.
    basePath: process.env.SITE_BASE_PATH || undefined,
    pageExtensions: ["site.tsx"],
  }),
};

export default nextConfig;

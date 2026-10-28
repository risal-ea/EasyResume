import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local single-user app: keep the dev/build output quiet and predictable.
  poweredByHeader: false,
  devIndicators: false,
};

export default nextConfig;

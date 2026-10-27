import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // A barrel of thousands of icon modules; only load the ones imported.
    optimizePackageImports: ["@hugeicons/core-free-icons"],
  },
};

export default nextConfig;

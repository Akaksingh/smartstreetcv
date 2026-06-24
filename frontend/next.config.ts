import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow <img> tags from localhost backend (for uploaded photos)
  // Using plain <img> tags so this is informational only — no Next/Image restrictions apply
  async rewrites() {
    return [];
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "node:path";
import { securityHeaderRules } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.2"],
  poweredByHeader: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return securityHeaderRules();
  },
};

export default nextConfig;

// Enable calling getCloudflareContext() in next dev.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

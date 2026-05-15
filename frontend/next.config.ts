import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

// Next infers workspace root from lockfiles; a stray ~/pnpm-lock.yaml was breaking
// dev asset URLs (HTML 200 but /_next/static/* 404). Pin tracing to this app root.
const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: configDir,
  /** Dev: slow machines / HMR can hit default chunk load timeouts; reduces spurious ChunkLoadError on `app/layout`. */
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer && config.output) {
      config.output.chunkLoadTimeout = 180_000;
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: "/interview/:session_id",
        destination: "/quiz/:session_id",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

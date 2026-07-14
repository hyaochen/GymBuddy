import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server (server.js + traced node_modules subset)
  // so the Docker runner stage doesn't need a full `npm ci` (T-GB-018).
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wger.de",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
};

export default nextConfig;

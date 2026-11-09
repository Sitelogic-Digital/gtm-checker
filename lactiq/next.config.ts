import type { NextConfig } from "next";

const canonicalHosts = ["lactiq.uk", "www.lactiq.uk", "lactiq.run", "www.lactiq.run", "www.lactiq.co.uk"];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return canonicalHosts.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://lactiq.co.uk/:path*",
      permanent: true,
    }));
  },
};

export default nextConfig;

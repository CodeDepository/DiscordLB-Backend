import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "trackmania.exchange",
        pathname: "/maps/thumbnail/**",
      },
    ],
  },
};

export default nextConfig;

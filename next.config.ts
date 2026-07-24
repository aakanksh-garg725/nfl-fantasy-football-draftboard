import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Player headshots, written into players.photo_url by the Sleeper import.
    // Serving them through the optimizer matters here: the originals are
    // ~100KB PNGs and the pool renders them at 56px across hundreds of cards.
    remotePatterns: [new URL("https://sleepercdn.com/content/nfl/players/**")],
  },
};

export default nextConfig;

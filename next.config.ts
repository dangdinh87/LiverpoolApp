import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Premier League (FPL player photos + team badges)
      { protocol: "https", hostname: "resources.premierleague.com" },
      // Unsplash (hero backgrounds)
      { protocol: "https", hostname: "images.unsplash.com" },
      // Football-Data.org (team crests)
      { protocol: "https", hostname: "crests.football-data.org" },
      // Wikipedia (competition logos — e.g. FDO UCL emblem)
      { protocol: "https", hostname: "upload.wikimedia.org" },
      // ESPN (team logos for cup fixtures)
      { protocol: "https", hostname: "a.espncdn.com" },
      // Supabase Storage (user avatars)
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      // News sources — LFC Official
      { protocol: "https", hostname: "backend.liverpoolfc.com" },
      // News sources — BBC
      { protocol: "https", hostname: "ichef.bbci.co.uk" },
      // News sources — Guardian
      { protocol: "https", hostname: "i.guim.co.uk" },
      { protocol: "https", hostname: "media.guim.co.uk" },
      // News sources — Bongda.com.vn
      { protocol: "https", hostname: "bongda.com.vn" },
      { protocol: "https", hostname: "*.bongda.com.vn" },
      // News sources — 24h.com.vn
      { protocol: "https", hostname: "cdn.24h.com.vn" },
      { protocol: "https", hostname: "*.24h.com.vn" },
      // News sources — Bongdaplus.vn
      { protocol: "https", hostname: "bongdaplus.vn" },
      { protocol: "https", hostname: "*.bongdaplus.vn" },
    ],
  },
};

export default nextConfig;

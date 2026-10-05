import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

// Baseline security headers. No full Content-Security-Policy yet: AdSense and
// GTM load scripts from many hosts, so an enforcing CSP needs a report-only
// trial first. `frame-ancestors` alone is safe and stops clickjacking of the
// login and comment forms.
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Lets parallel dev servers (one per engineer/agent) use separate build dirs;
  // Next refuses to run two servers on the same one. Unset = default `.next`.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  serverExternalPackages: ['rss-parser'],
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  images: {
    qualities: [75, 85],
    // Next rejects more than 50 entries (dev server refuses to start): prefer one
    // `*.domain` wildcard over several hosts of the same site. News article
    // images are rendered `unoptimized`, so only hosts that go through the
    // optimizer (avatars, crests, gallery, hero photos) really need an entry.
    remotePatterns: [
      // Google user content (OAuth avatars)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Premier League (FPL player photos + team badges)
      { protocol: 'https', hostname: 'resources.premierleague.com' },
      // Unsplash (hero backgrounds)
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Cloudinary (gallery images)
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Football-Data.org (team crests)
      { protocol: 'https', hostname: 'crests.football-data.org' },
      // Wikipedia (competition logos — e.g. FDO UCL emblem)
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      // ESPN (team logos for cup fixtures)
      // Supabase Storage (user avatars)
      { protocol: 'https', hostname: '*.supabase.co' },
      // News sources — LFC Official
      { protocol: 'https', hostname: 'backend.liverpoolfc.com' },
      // News sources — BBC
      { protocol: 'https', hostname: 'ichef.bbci.co.uk' },
      // News sources — Guardian
      { protocol: 'https', hostname: 'i.guim.co.uk' },
      { protocol: 'https', hostname: 'media.guim.co.uk' },
      // News sources — Bongda.com.vn
      { protocol: 'https', hostname: 'bongda.com.vn' },
      { protocol: 'https', hostname: '*.bongda.com.vn' },
      // News sources — 24h.com.vn
      { protocol: 'https', hostname: '*.24h.com.vn' },
      // News sources — Bongdaplus.vn
      { protocol: 'https', hostname: 'bongdaplus.vn' },
      { protocol: 'https', hostname: '*.bongdaplus.vn' },
      // News sources — This Is Anfield (WordPress)
      { protocol: 'https', hostname: '*.thisisanfield.com' },
      // News sources — Liverpool Echo (Reach PLC; images on i2-prod CDN)
      { protocol: 'https', hostname: '*.liverpoolecho.co.uk' },
      // News sources — Sky Sports (365 Media CDN)
      { protocol: 'https', hostname: '*.skysports.com' },
      { protocol: 'https', hostname: '*.365dm.com' },
      // News sources — Anfield Watch (WordPress)
      { protocol: 'https', hostname: '*.anfieldwatch.co.uk' },
      // News sources — Dân Trí
      { protocol: 'https', hostname: 'dantri.com.vn' },
      { protocol: 'https', hostname: '*.dantri.com.vn' },
      // News sources — Zing News
      { protocol: 'https', hostname: 'zingnews.vn' },
      { protocol: 'https', hostname: '*.zingnews.vn' },
      // News sources — VietNamNet
      { protocol: 'https', hostname: 'vietnamnet.vn' },
      { protocol: 'https', hostname: '*.vietnamnet.vn' },
      { protocol: 'https', hostname: '*.vnncdn.net' },
      // News sources — Bóng Đá Số
      { protocol: 'https', hostname: 'bongdaso.com' },
      { protocol: 'https', hostname: '*.bongdaso.com' },
      // News sources — Webthethao
      // News sources — Empire of the Kop
      { protocol: 'https', hostname: '*.empireofthekop.com' },
      // News sources — VnExpress (thethao)
      { protocol: 'https', hostname: '*.vnecdn.net' },
      // News sources — Tuổi Trẻ
      { protocol: 'https', hostname: '*.tuoitre.vn' },
      // News sources — Reach PLC network (birminghammail, football.london, liverpool.com, manchestereveningnews)
      { protocol: 'https', hostname: 'i2-prod.birminghammail.co.uk' },
      { protocol: 'https', hostname: 'i2-prod.football.london' },
      { protocol: 'https', hostname: 'i2-prod.liverpool.com' },
      { protocol: 'https', hostname: 'i2-prod.manchestereveningnews.co.uk' },
      // News sources — hosts found without a matching pattern in the Oct 2026 crawler audit
      { protocol: 'https', hostname: 'i2-prod.mirror.co.uk' },
      { protocol: 'https', hostname: 'i2-prod.dailystar.co.uk' },
      { protocol: 'https', hostname: 'static.independent.co.uk' },
      // ESPN image hosts (a.–a4.espncdn.com)
      { protocol: 'https', hostname: '*.espncdn.com' },
      { protocol: 'https', hostname: 'anfieldindex.com' },
      { protocol: 'https', hostname: '*.bongda24h.vn' },
      { protocol: 'https', hostname: 'photo.znews.vn' },
      { protocol: 'https', hostname: 'images2.thanhnien.vn' },
      { protocol: 'https', hostname: 'sohanews.sohacdn.com' },
      { protocol: 'https', hostname: 'cdn.tienphong.vn' },
      // Reach sister-site images that Echo items reuse
      { protocol: 'https', hostname: 'i2-prod.chroniclelive.co.uk' },
      { protocol: 'https', hostname: 'i2-prod.coventrytelegraph.net' },
    ],
  },
};

export default withNextIntl(nextConfig);

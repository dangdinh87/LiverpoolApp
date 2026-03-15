import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  serverExternalPackages: ['rss-parser'],
  images: {
    qualities: [75, 85],
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
      { protocol: 'https', hostname: 'a.espncdn.com' },
      // Supabase Storage (user avatars)
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
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
      { protocol: 'https', hostname: 'cdn.24h.com.vn' },
      { protocol: 'https', hostname: '*.24h.com.vn' },
      // News sources — Bongdaplus.vn
      { protocol: 'https', hostname: 'bongdaplus.vn' },
      { protocol: 'https', hostname: '*.bongdaplus.vn' },
      // News sources — This Is Anfield (WordPress)
      { protocol: 'https', hostname: 'www.thisisanfield.com' },
      { protocol: 'https', hostname: '*.thisisanfield.com' },
      // News sources — Liverpool Echo (Reach PLC; images on i2-prod CDN)
      { protocol: 'https', hostname: 'www.liverpoolecho.co.uk' },
      { protocol: 'https', hostname: 'i2-prod.liverpoolecho.co.uk' },
      { protocol: 'https', hostname: '*.liverpoolecho.co.uk' },
      // News sources — Sky Sports (365 Media CDN)
      { protocol: 'https', hostname: 'www.skysports.com' },
      { protocol: 'https', hostname: '*.skysports.com' },
      { protocol: 'https', hostname: 'e0.365dm.com' },
      { protocol: 'https', hostname: '*.365dm.com' },
      // News sources — Anfield Watch (WordPress)
      { protocol: 'https', hostname: 'www.anfieldwatch.co.uk' },
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
      { protocol: 'https', hostname: 'webthethao.vn' },
      { protocol: 'https', hostname: '*.webthethao.vn' },
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
    ],
  },
};

export default withNextIntl(nextConfig);

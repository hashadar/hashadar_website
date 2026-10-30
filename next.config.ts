import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // R3F / three addons often ship untranspiled ESM; required for Next App Router.
  transpilePackages: ["three"],
  turbopack: {
    root: __dirname,
  },
  async headers() {
    // Court Board is a public-write Lab (ADR 0013): its pages are never indexed,
    // and the Organiser link is a bearer token that must not leak via Referer or caches.
    const privateOrganiserPage = [
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Cache-Control', value: 'no-store' },
    ];
    return [
      {
        source: '/labs/court-board/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      { source: '/labs/court-board/o', headers: privateOrganiserPage },
      { source: '/labs/court-board/o/:path*', headers: privateOrganiserPage },
    ];
  },
  async redirects() {
    return [
      {
        source: '/labs/job-market',
        destination: '/labs',
        permanent: true,
      },
      {
        source: '/labs/job-market/:path*',
        destination: '/labs',
        permanent: true,
      },
    ];
  },
  images: {
    // Amplify Hosting compute serves `/_next/image`; sharp is a direct dependency
    // so local `next start` and CI match production optimisation. Amplify also
    // supplies sharp at deploy time. Optimised output is capped at ~4.3 MB.
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 85, 90, 100],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
};

export default nextConfig;

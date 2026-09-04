import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // R3F / three addons often ship untranspiled ESM; required for Next App Router.
  transpilePackages: ["three"],
  turbopack: {
    root: __dirname,
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

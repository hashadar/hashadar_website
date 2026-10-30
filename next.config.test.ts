import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('next.config image optimisation', () => {
  it('keeps the intentional Next image optimisation path enabled', () => {
    expect(nextConfig.images?.unoptimized).not.toBe(true);
    expect(nextConfig.images?.formats).toEqual(
      expect.arrayContaining(['image/webp', 'image/avif']),
    );
    expect(nextConfig.images?.remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hostname: '**.amazonaws.com' }),
        expect.objectContaining({ hostname: '**.cloudfront.net' }),
      ]),
    );
  });
});

describe('next.config R3F / three', () => {
  it('transpiles three for App Router compatibility', () => {
    expect(nextConfig.transpilePackages).toEqual(
      expect.arrayContaining(['three']),
    );
  });
});

describe('next.config Court Board headers', () => {
  it('keeps every Court Board route out of search indexes', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((rule) => rule.source === '/labs/court-board/:path*');
    expect(all?.headers).toEqual(
      expect.arrayContaining([{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]),
    );
  });

  it('stops the Organiser link leaking through Referer or caches', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    for (const source of ['/labs/court-board/o', '/labs/court-board/o/:path*']) {
      const rule = rules.find((r) => r.source === source);
      expect(rule?.headers).toEqual(
        expect.arrayContaining([
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
        ]),
      );
    }
  });
});
